/* Cuoricino: collegamento tra due telefoni tramite Supabase (REST + polling).
   Espone la stessa interfaccia minima del db dell'artefatto: doc/collection/onSnapshot/set/update/delete/get. */
(function(){
'use strict';
const KEY='sintonia-cloud-v1';
window.DUCloud=function(cfg){
  const base=String(cfg.url||'').replace(/\/$/,''), anon=cfg.key;
  let pend={}, sess=null, couple=null, cache={}, listeners=[], cursor='', ready=false, polling=false, timer=0, chain=Promise.resolve(), lastErr=null;
  try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v){sess=v.sess||null;couple=v.couple||null}}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({sess:sess,couple:couple}))}catch(e){}};
  const now=()=>Math.floor(Date.now()/1000);
  async function raw(path,opt){
    const h=Object.assign({apikey:anon,'Content-Type':'application/json'},opt&&opt.headers||{});
    const r=await fetch(base+path,Object.assign({},opt,{headers:h}));
    const txt=await r.text(); let j=null; try{j=txt?JSON.parse(txt):null}catch(e){}
    if(!r.ok){const m=(j&&(j.message||j.msg||j.error_description||j.error))||('HTTP '+r.status);const er=new Error(m);er.status=r.status;throw er}
    return j;
  }
  function setSess(j){sess={at:j.access_token,rt:j.refresh_token,exp:now()+(j.expires_in||3600),uid:j.user&&j.user.id};save()}
  async function auth(){
    if(sess&&sess.exp-60>now())return;
    if(sess&&sess.rt){
      try{setSess(await raw('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:sess.rt})}));return}catch(e){if(e.status!==400&&e.status!==401&&e.status!==403)throw e}
    }
    setSess(await raw('/auth/v1/signup',{method:'POST',body:JSON.stringify({})}));
  }
  async function req(path,opt){
    await auth(); opt=opt||{}; opt.headers=Object.assign({Authorization:'Bearer '+sess.at},opt.headers||{});
    return raw(path,opt);
  }
  const rpc=(fn,args)=>req('/rest/v1/rpc/'+fn,{method:'POST',body:JSON.stringify(args||{})});

  /* cache + ascoltatori */
  const snapDoc=p=>({exists:p in cache,id:p.split('/').pop(),data:()=>JSON.parse(JSON.stringify(cache[p]||{}))});
  const fire=()=>listeners.forEach(l=>{try{l()}catch(e){}});
  function listen(f){listeners.push(f);if(ready)setTimeout(f,0);startPoll();return()=>{listeners=listeners.filter(x=>x!==f)}}
  async function poll(){
    if(polling||!couple)return; polling=true;
    try{
      let q='/rest/v1/docs?couple=eq.'+couple.id+'&path=not.like.'+encodeURIComponent('photofull/*')+'&select=path,data,deleted,updated_at&order=updated_at.asc&limit=1000';
      if(cursor)q+='&updated_at=gt.'+encodeURIComponent(cursor);
      const rows=await req(q); let ch=false;
      const E=window.DUCrypto;
      for(const r of rows){if(!r.deleted&&E&&E.has())r.data=await E.decDoc(r.path,r.data)}
      rows.forEach(r=>{cursor=r.updated_at;if(pend[r.path]>0)return;if(r.deleted)delete cache[r.path];else cache[r.path]=r.data;ch=true});
      if(ch||!ready){ready=true;fire()}
      lastErr=null;
    }catch(e){lastErr=e}
    finally{polling=false}
  }
  function startPoll(){
    if(timer||!couple)return;
    timer=setInterval(()=>{if(document.visibilityState!=='hidden')poll()},3000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')poll()});
    poll();
  }
  const enqueue=fn=>{chain=chain.then(fn).catch(e=>{lastErr=e;throw e});return chain};
  const write=(path,data,deleted)=>{pend[path]=(pend[path]||0)+1;return enqueue(async()=>{
    const E=window.DUCrypto, out=(deleted||!E||!E.has())?(deleted?null:data):await E.encDoc(path,data);
    return req('/rest/v1/docs?on_conflict=couple,path',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({couple:couple.id,path:path,data:out,deleted:!!deleted})})}).then(()=>{setTimeout(poll,250)}).finally(()=>{pend[path]--})};
  const isFull=p=>p.indexOf('photofull/')===0;

  const db={
    doc:path=>({
      set:d=>{if(!isFull(path)){cache[path]=JSON.parse(JSON.stringify(d));fire()}return write(path,d,false)},
      update:d=>{const n=Object.assign({},cache[path]||{},JSON.parse(JSON.stringify(d)));cache[path]=n;fire();return write(path,n,false)},
      delete:()=>{delete cache[path];fire();return write(path,null,true)},
      get:async()=>{
        if(!isFull(path))return snapDoc(path);
        const rows=await req('/rest/v1/docs?couple=eq.'+couple.id+'&path=eq.'+encodeURIComponent(path)+'&deleted=eq.false&select=data');
        let d=rows&&rows[0]&&rows[0].data; const E=window.DUCrypto; if(d&&E&&E.has())d=await E.decDoc(path,d);
        return {exists:!!d,id:path.split('/').pop(),data:()=>d||{}};
      },
      onSnapshot:(cb,err)=>listen(()=>cb(snapDoc(path)))
    }),
    collection:c=>{
      let fld='at',dir='desc',lim=1000;
      const q={
        orderBy:(f,d)=>{fld=f;dir=d||'asc';return q},
        limit:n=>{lim=n;return q},
        onSnapshot:(cb,err)=>listen(()=>{
          const docs=Object.keys(cache).filter(k=>k.indexOf(c+'/')===0).map(k=>snapDoc(k));
          docs.sort((a,b)=>{const x=a.data()[fld]||0,y=b.data()[fld]||0;return dir==='desc'?(y>x?1:y<x?-1:0):(x>y?1:x<y?-1:0)});
          cb({docs:docs.slice(0,lim)});
        })
      };
      return q;
    }
  };

  return {
    available:!!(base&&anon),
    hasCouple:()=>!!couple,
    code:()=>couple&&couple.code,
    uid:()=>sess&&sess.uid,
    error:()=>lastErr,
    db:db,
    async init(){await auth();return sess.uid},
    async create(){couple=await rpc('create_couple');cache={};cursor='';ready=false;save();return couple},
    async join(code){
      const c=String(code||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
      couple=await rpc('join_couple',{c:c});cache={};cursor='';ready=false;save();return couple;
    },
    async deviceCode(){return rpc('make_device_code')},
    rpc:rpc,
    async fn(name,body){
      await auth();
      const r=await fetch(base+'/functions/v1/'+name,{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+sess.at,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
      if(!r.ok)throw new Error('HTTP '+r.status); return r.json().catch(()=>({}));
    },
    /* Scorre tutti i documenti della coppia, a pagine. */
    async scan(fn){
      let last='';
      for(;;){
        const rows=await req('/rest/v1/docs?couple=eq.'+couple.id+'&deleted=eq.false&select=path,data&order=path.asc&limit=30'+(last?'&path=gt.'+encodeURIComponent(last):''));
        if(!rows.length)break;
        for(const r of rows){last=r.path; await fn(r)}
        if(rows.length<30)break;
      }
    },
    /* Cifra (o porta al formato nuovo) tutto ciò che è ancora in chiaro. Sicura da rifare: salta ciò che è già a posto.
       Le risposte dell'altro le aggiorna il suo telefono, a meno che non si chieda esplicitamente. */
    async migrate(progress,withAnswers){
      const E=window.DUCrypto; if(!E||!E.has()||!couple)return {done:0};
      let n=0;
      await this.scan(async r=>{
        if(r.path.indexOf('answers/')===0&&!withAnswers)return;
        if(await E.needsEnc(r.path,r.data)){await write(r.path,await E.reencrypt(r.path,r.data),false);n++; if(progress)progress(n)}
      });
      return {done:n};
    },
    /* Cambio della chiave: tutto viene ricifrato con la nuova. Chi ha già la chiave nuova in uso (beginRotation) lo chiama;
       l'altro telefono viene fermato dal segnale couple/rotating e poi chiede la chiave nuova. */
    async rotate(progress){
      const E=window.DUCrypto; if(!E||!E.has()||!E.rotating()||!couple)throw new Error('cambio non avviato');
      await write('couple/rotating',{by:(sess&&sess.uid)||'',at:Date.now()},false);
      await new Promise(r=>setTimeout(r,4500));  /* il tempo che l'altro telefono veda il segnale e si fermi */
      let total=0;
      for(let pass=0;pass<5;pass++){
        let changed=0;
        await this.scan(async r=>{
          if(await E.allOpen(r.path,r.data)&&!(await E.needsEnc(r.path,r.data)))return;
          await write(r.path,await E.reencrypt(r.path,r.data),false); changed++; total++; if(progress)progress(total);
        });
        if(!changed)break;
        await new Promise(r=>setTimeout(r,1500));
      }
      await write('couple/keycheck',{v:await E.makeCheck()},false);
      await write('couple/rotating',null,true);
      await E.endRotation();
      return {done:total};
    },
    leave(){couple=null;sess=null;cache={};listeners=[];cursor='';ready=false;clearInterval(timer);timer=0;try{localStorage.removeItem(KEY)}catch(e){}}
  };
};
})();
