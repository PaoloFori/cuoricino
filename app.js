/* Cuoricino v3: app principale */
(function(){
'use strict';
const D=window.DUC, DECK=D.DECK, ALLPACKS=D.PACKS.concat(D.HOTPACKS), CITIES=D.CITIES;

/* ---------- Stato ---------- */
const S={mode:'boot',profile:null,answers:{A:{},B:{}},slot:null,active:'A',tab:'home',view:null,
  draw:null,deckCat:'all',quick:null,quickN:10,quickHot:false,game:null,scores:{A:0,B:0},play:null,freeze:false,
  photos:[],events:[],stories:[],custom:[],chat:[],pcat:'all',full:{},photoView:null,confirmDel:false,confirmReset:false,
  canWrite:true,loadedP:false,slow:false,err:null,uid:null,dirty:false,photosOk:true,
  slots:{},loadedS:false,welcome:null,cloudOn:false,notifOn:false,geoOn:false,rtab:'time',ev:null,cq:null,st:'',nt:'',pickKind:null,storyTxt:'',icElim:null,icGuess:false};
let db=null, idb=null, cloud=null;
const LS='duetto-v3', mem={};
const lget=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lset=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
S.notifOn=lget('sint-notif')==='1'; S.geoOn=lget('sint-geo')!=='0';
function lsLoad(){try{return JSON.parse(localStorage.getItem(LS))||mem.v||null}catch(e){return mem.v||null}}
function lsSave(){
  const v={profile:S.profile,answers:S.answers,active:S.active,draw:S.draw,quick:S.quick,game:S.game,scores:S.scores};
  mem.v=v; try{localStorage.setItem(LS,JSON.stringify(v))}catch(e){}
}

/* ---------- Utilità ---------- */
const $app=document.getElementById('app'), $nav=document.getElementById('nav'), $toast=document.getElementById('toast'), $file=document.getElementById('f-photo');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const dnum=s=>{const p=s.split('-').map(Number);return Date.UTC(p[0],p[1]-1,p[2])/86400000};
const addDays=(s,n)=>{const t=new Date((dnum(s)+n)*86400000);return t.getUTCFullYear()+'-'+pad(t.getUTCMonth()+1)+'-'+pad(t.getUTCDate())};
const pl=(n,a,b)=>n+' '+(n===1?a:b);
const done=v=>v!==undefined&&v!==null;
const ans=(slot,key)=>(S.answers[slot]||{})[key];
const me=()=>S.mode==='shared'?S.slot:S.active;
const other=m=>m==='A'?'B':'A';
const nm=slot=>{const n=(S.profile&&S.profile.names)||{};return n[slot]||(slot==='A'?'Tu':'Partner')};
const since=()=>(S.profile&&S.profile.since)||todayStr();
const meet=()=>(S.profile&&S.profile.meet)||{};
const safeImg=s=>(typeof s==='string'&&s.indexOf('data:image/jpeg;base64,')===0)?s:'';
const hotOn=()=>!!((S.answers.A||{}).hotok&&(S.answers.B||{}).hotok);
const RO='Sei in sola lettura: chiedi di essere aggiunto come collaboratore.';
const newId=()=>'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a};
const fmtDate=s=>{try{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}catch(e){return s}};
let toastT=0;
function toast(m){$toast.textContent=m;$toast.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{$toast.hidden=true},3500)}

const heartSvg=cls=>`<svg class="${cls||'hk'}" viewBox="0 0 24 24" aria-hidden="true"><use href="#heart"/></svg>`;
const roseSvg=cls=>`<svg class="${cls||'rosee'}" viewBox="0 0 64 64" aria-hidden="true"><use href="#rose"/></svg>`;
const markSvg=w=>`<svg width="${w}" height="${Math.round(w*0.66)}" viewBox="0 0 38 25" aria-hidden="true"><use href="#heart" x="0" y="0" width="25" height="25" class="ca"/><use href="#heart" x="13" y="0" width="25" height="25" class="cb" style="fill-opacity:.85"/></svg>`;
const xSvg='<svg class="ck" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg>';
const lockSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const hdiv=()=>`<div class="hdiv" aria-hidden="true">${heartSvg()}${heartSvg()}${heartSvg()}</div>`;
function pill(slot,txt,wait){
  if(wait)return `<div class="pill wait"><i class="dot ${slot}"></i><span class="who">${esc(nm(slot))}</span><span class="val">In attesa</span></div>`;
  return `<div class="pill ${slot}"><i class="dot ${slot}"></i><span class="who">${esc(nm(slot))}</span><span class="val">${esc(txt)}</span></div>`;
}

/* ---------- Render: coalescente, mai durante un gioco a canvas ---------- */
let rqT=0;
function rq(){if(rqT)return;rqT=requestAnimationFrame(()=>{rqT=0;render()})}
function go(){render(true);window.scrollTo(0,0)}

/* ---------- Persistenza risposte ---------- */
const chains={A:Promise.resolve(),B:Promise.resolve()};
function queueWrite(m){
  const payload=Object.assign({},S.answers[m]);
  chains[m]=chains[m].then(()=>db.doc('answers/'+m).set(payload)).catch(()=>toast('Non riesco a salvare. Controlla la connessione.'));
}
function saveMine(fields){
  if(!S.canWrite){toast(RO);return false}
  const m=me(); if(!m)return false;
  S.answers[m]=Object.assign({},S.answers[m],fields);
  if(S.mode==='local')lsSave(); else queueWrite(m);
  return true;
}
const saveAns=(key,val)=>{
  const ok=saveMine({[key]:val});
  if(ok&&/^(d\d{4}-|mr\d{6}q)/.test(key)){const m=me(),st=streak();if(st>(+(S.answers[m]||{}).maxst||0))saveMine({maxst:st})}
  return ok;
};

/* ---------- Archivio: collezioni (shared = db, local = IndexedDB) ---------- */
function idbOpen(){return new Promise((res,rej)=>{try{
  const r=indexedDB.open('duetto',3);
  r.onupgradeneeded=()=>{const d=r.result;
    if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos',{keyPath:'id'});
    if(!d.objectStoreNames.contains('docs'))d.createObjectStore('docs',{keyPath:'k'});
    if(!d.objectStoreNames.contains('full'))d.createObjectStore('full',{keyPath:'id'});};
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
}catch(e){rej(e)}})}
const idbAll=st=>new Promise((res,rej)=>{const q=idb.transaction(st,'readonly').objectStore(st).getAll();q.onsuccess=()=>res(q.result||[]);q.onerror=()=>rej(q.error)});
const idbPut=(st,rec)=>new Promise((res,rej)=>{const q=idb.transaction(st,'readwrite').objectStore(st).put(rec);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)});
const idbDel=(st,k)=>new Promise((res,rej)=>{const q=idb.transaction(st,'readwrite').objectStore(st).delete(k);q.onsuccess=()=>res();q.onerror=()=>rej(q.error)});
const idbGet=(st,k)=>new Promise((res,rej)=>{const q=idb.transaction(st,'readonly').objectStore(st).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});

function sortL(c){
  const a=S[c];
  if(c==='events')a.sort((x,y)=>(y.date||'').localeCompare(x.date||'')||y.at-x.at); else a.sort((x,y)=>y.at-x.at);
}
function upsertL(c,rec){const a=S[c],i=a.findIndex(x=>x.id===rec.id);if(i<0)a.push(rec);else a[i]=rec;sortL(c)}
async function putRec(c,rec){
  upsertL(c,rec);
  const data=Object.assign({},rec); delete data.id;
  if(S.mode==='shared')await db.doc(c+'/'+rec.id).set(data); else await idbPut('docs',{k:c+'/'+rec.id,d:data});
}
async function delRec(c,id){
  S[c]=S[c].filter(x=>x.id!==id);
  if(S.mode==='shared')await db.doc(c+'/'+id).delete(); else await idbDel('docs',c+'/'+id);
}
async function putFull(id,img){if(S.mode==='shared')await db.doc('photofull/'+id).set({img:img}); else await idbPut('full',{id:id,img:img})}
async function getFull(id){
  if(S.mode==='shared'){const s=await db.doc('photofull/'+id).get();return s.exists?s.data().img:null}
  const r=await idbGet('full',id); return r?r.img:null;
}
async function delFull(id){try{if(S.mode==='shared')await db.doc('photofull/'+id).delete(); else await idbDel('full',id)}catch(e){}}

/* ---------- Immagini ---------- */
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('img'))};im.src=u})}
function scaled(im,max,q,square){
  let sx=0,sy=0,sw=im.naturalWidth,sh=im.naturalHeight;
  if(square){const s=Math.min(sw,sh);sx=(sw-s)/2;sy=(sh-s)/2;sw=sh=s}
  const r=Math.min(1,max/Math.max(sw,sh)), w=Math.max(1,Math.round(sw*r)), h=Math.max(1,Math.round(sh*r));
  const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,sx,sy,sw,sh,0,0,w,h);
  return c.toDataURL('image/jpeg',q);
}
async function prep(file,o){
  const im=await loadImg(file); let img,max=o.max,q=.74;
  do{img=scaled(im,max,q,o.square);max=Math.round(max*.85);q=Math.max(.45,q-.06)}while(img.length>o.lim&&max>120);
  return {img:img,th:o.th?scaled(im,o.th,.7):null};
}
/* ---------- Luogo delle foto: GPS dai metadati EXIF (JPEG) ---------- */
function parseTiff(v,t){
  const le=v.getUint16(t)===0x4949, u16=o=>v.getUint16(o,le), u32=o=>v.getUint32(o,le);
  const ifd0=t+u32(t+4); let gps=null; const n=u16(ifd0);
  for(let i=0;i<n;i++){const e=ifd0+2+i*12;if(u16(e)===0x8825){gps=t+u32(e+8);break}}
  if(!gps)return null;
  const g={}, c=u16(gps);
  for(let i=0;i<c;i++){
    const e=gps+2+i*12, tag=u16(e);
    if(tag===1||tag===3)g[tag]=String.fromCharCode(v.getUint8(e+8));
    else if(tag===2||tag===4){const off=t+u32(e+8);const r=k=>u32(off+k*8)/(u32(off+k*8+4)||1);g[tag]=r(0)+r(1)/60+r(2)/3600}
  }
  if(g[2]===undefined||g[4]===undefined)return null;
  const la=g[2]*(g[1]==='S'?-1:1), lo=g[4]*(g[3]==='W'?-1:1);
  if(!isFinite(la)||!isFinite(lo)||(la===0&&lo===0)||Math.abs(la)>90||Math.abs(lo)>180)return null;
  return {la:Math.round(la*1e4)/1e4,lo:Math.round(lo*1e4)/1e4};
}
async function exifGps(file){
  try{
    const v=new DataView(await file.slice(0,262144).arrayBuffer());
    if(v.getUint16(0)!==0xFFD8)return null;
    let o=2;
    while(o+10<v.byteLength){
      const m=v.getUint16(o), len=v.getUint16(o+2);
      if(m===0xFFE1&&v.getUint32(o+4)===0x45786966)return parseTiff(v,o+10);
      if((m&0xFF00)!==0xFF00)break;
      o+=2+len;
    }
  }catch(e){}
  return null;
}
function hav(la1,lo1,la2,lo2){
  const R=6371, rad=x=>x*Math.PI/180, dLa=rad(la2-la1), dLo=rad(lo2-lo1);
  const h=Math.sin(dLa/2)**2+Math.cos(rad(la1))*Math.cos(rad(la2))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function placeName(gp){
  if(!gp)return '';
  let best=null,bd=1e9; CITIES.forEach(c=>{const d=hav(gp.la,gp.lo,c[1],c[2]);if(d<bd){bd=d;best=c[0]}});
  return bd<60?'vicino a '+best:gp.la.toFixed(2)+', '+gp.lo.toFixed(2);
}
/* Foto di un momento: fino a 3. Vecchi momenti hanno una sola foto (th), nuovi hanno ths. */
const evThs=e=>(e.ths&&e.ths.length)?e.ths:(e.th?[e.th]:[]);
const evFid=(e,i)=>e.ths?e.id+'_'+i:e.id;
$file.addEventListener('change',async()=>{
  const files=Array.prototype.slice.call($file.files||[]); $file.value='';
  if(!files.length)return;
  const kind=S.pickKind;
  if(!S.canWrite){toast(RO);return}
  const m=me();
  try{
    if(kind==='album'){
      if(S.photos.length>=150){toast('L\'album è pieno: elimina qualche foto.');return}
      let ok=0, withGps=0;
      for(let i=0;i<files.length;i++){
        toast('Carico la foto '+(i+1)+' di '+files.length+'…');
        try{const gp=await exifGps(files[i]);const p=await prep(files[i],{max:1000,lim:170000,th:300}),id=newId();
          await putFull(id,p.img); const rec={id:id,by:m,at:Date.now(),cap:'',th:p.th}; if(gp){rec.gp=gp;withGps++} await putRec('photos',rec); ok++}
        catch(e){toast('Una foto non è stata caricata.')}
      }
      if(ok)toast((ok===1?'Foto aggiunta':ok+' foto aggiunte')+(withGps?' · '+withGps+' con luogo sulla mappa':' · senza luogo: puoi assegnarlo dalla foto'));
    }else if(kind==='event'){
      S.ev=S.ev||{}; S.ev.imgs=S.ev.imgs||[];
      const room=3-S.ev.imgs.length; let got=0, gps=false;
      if(room<=0){toast('Massimo 3 foto per momento.')}
      for(let i=0;i<Math.min(room,files.length);i++){
        toast('Carico la foto '+(i+1)+' di '+Math.min(room,files.length)+'…');
        try{const gp=await exifGps(files[i]), p=await prep(files[i],{max:900,lim:150000,th:260});S.ev.imgs.push({img:p.img,th:p.th});got++;if(gp&&!S.ev.gp){S.ev.gp=gp;gps=true}}
        catch(e){toast('Una foto non è stata caricata.')}
      }
      if(files.length>room&&room>0)toast('Ho preso le prime '+room+': il massimo è 3 foto.');
      else if(got)toast(gps?'Foto pronta, luogo rilevato':'Foto pronta');
    }else if(kind==='story'){
      const p=await prep(files[0],{max:720,lim:140000});
      await putRec('stories',{id:newId(),by:m,at:Date.now(),img:p.img,text:(S.storyTxt||'').trim().slice(0,100)});
      S.storyTxt=''; toast('Storia pubblicata (dura 24 ore)');
    }else if(kind==='avatar'){
      const p=await prep(files[0],{max:150,lim:14000,square:true}); saveMine({av:p.img}); toast('Foto profilo aggiornata');
    }
  }catch(e){toast('Non riesco a caricare l\'immagine.')}
  render(true);
});
function pickFile(kind,multi){S.pickKind=kind;$file.multiple=!!multi;$file.click()}

/* ---------- Domande ---------- */
const NAMES3=()=>[nm('A'),nm('B'),'Tutti e due'];
function optsOfQ(q){if(q.who){const a=NAMES3();if(q.nope)a.push(D.NOPE);return a}return q.o}
function deckItem(i){const q=DECK[i];return {key:'k'+i,t:q.t,o:optsOfQ(q),hot:!!q.hot}}
function customItem(c){return {key:'c'+c.id,t:c.t,o:(c.o&&c.o.length>=2)?c.o:null,hot:!!c.hot,by:c.by,id:c.id}}
const IDX={d:[],w:[],x:[]};
DECK.forEach((q,i)=>{if(i>=(D.BASE_N||DECK.length))return;if(q.hot)IDX.x.push(i);else if(q.who)IDX.w.push(i);else IDX.d.push(i)}); /* le giornaliere restano sulle domande originali: cambiare l'elenco sposterebbe le domande già risposte */
function dailyItem(k,date){
  const l=IDX[k], idx=l[(dnum(date)+(k==='w'?7:k==='x'?3:0))%l.length], it=deckItem(idx);
  it.key=k+date; return it;
}
const isMonthEnd=d=>addDays(d,1).slice(8,10)==='01';
function recapItems(ym){
  const R=D.RECAP||[], seed=+ym.replace('-','');
  const fx=R.map((q,i)=>[q,i]).filter(x=>x[0].fixed), rest=R.map((q,i)=>[q,i]).filter(x=>!x[0].fixed);
  let r=seed;const rnd=()=>{r=(r*1103515245+12345)%2147483648;return r/2147483648};
  let extra=3; if(ym>='2026-11'){rnd();extra=3+Math.floor(rnd()*4)} /* 6-9 domande a seconda del mese */
  for(let i=rest.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}
  return fx.concat(rest.slice(0,extra)).map((x,n)=>({key:'mr'+ym.replace('-','')+'q'+n,t:x[0].t,o:x[0].o,hot:false}));
}
const dayDone=(slot,d)=>isMonthEnd(d)?recapItems(d.slice(0,7)).every(it=>done(ans(slot,it.key))):done(ans(slot,'d'+d));
function srcOf(src){
  if(src.indexOf('month:')===0)return {title:'Resoconto del mese',items:recapItems(src.slice(6))};
  if(src.indexOf('special:')===0)return spItems(src);
  if(src==='quick')return {title:'Quiz rapido',items:(S.quick&&S.quick.ids||[]).filter(i=>DECK[i]).map(deckItem)};
  const p=ALLPACKS.find(x=>'pack:'+x.id===src);
  return p?{title:p.title,items:p.qs.map((q,i)=>({key:p.id+'q'+i,t:q.t,o:q.o,hot:!!p.hot}))}:{title:'',items:[]};
}
const prog=(items,slot)=>items.filter(it=>done(ans(slot,it.key))).length;
function streak(){
  const both=d=>dayDone('A',d)&&dayDone('B',d);
  let d=todayStr(); if(!both(d))d=addDays(d,-1);
  let n=0; while(n<400&&both(d)){n++;d=addDays(d,-1)}
  return n;
}
const DCATS=[['all','Tutte'],['know','Conoscersi'],['fun','Divertenti'],['light','Innocue'],['curio','Curiosità'],['love','Romantiche'],['trip','Viaggi'],['food','Cibo'],['future','Futuro'],['past','Passato'],['pop','Cultura pop'],['deep','Profonde'],['work','Lavoro e studio'],['family','Famiglia e amici'],['body','Sport e benessere'],['nature','Natura e animali'],['dream','Sogni e fantasia'],['values','Valori'],['home','Casa e routine'],['tech','Tecnologia'],['money','Soldi e progetti'],['quirk','Manie e abitudini'],['child','Infanzia'],['conflict','Fiducia e litigi'],['hot','Hot 18+ · tutte'],['hot-flirt','Hot · Flirt e seduzione'],['hot-fant','Hot · Fantasie'],['hot-int','Hot · Intimità'],['hot-spicy','Hot · Piccanti']];
const isHot=c=>c==='hot'||(typeof c==='string'&&c.indexOf('hot-')===0);
const dcatName=c=>(DCATS.find(x=>x[0]===c)||['','Tutte'])[1];
function allowedDeck(cat){
  const on=hotOn(), r=[];
  DECK.forEach((q,i)=>{
    if(isHot(cat)){if(q.hot&&on&&(cat==='hot'||q.sub===cat.slice(4)))r.push(i)}
    else if(!q.hot&&(!cat||cat==='all'||q.cat===cat))r.push(i);
  });
  return r;
}
const validDraw=v=>typeof v==='number'?(DECK[v]?v:null):(typeof v==='string'&&v[0]==='c'&&v.length>1?v:null);
function customPool(cat){return S.custom.filter(c=>isHot(cat)?(c.hot&&hotOn()&&cat==='hot'):(!c.hot&&(cat==='all'||c.cat===cat))).map(c=>'c'+c.id)}
function drawNext(cat){
  const pool0=allowedDeck(cat).concat(customPool(cat)); if(!pool0.length)return null;
  const dn=i=>{const k=typeof i==='number'?'k'+i:i;return done(ans('A',k))&&done(ans('B',k))};
  const fresh=pool0.filter(i=>!dn(i));
  let pool=fresh.length?fresh:pool0;
  const cand=pool.filter(i=>i!==S.draw); if(cand.length)pool=cand;
  return pool[Math.floor(Math.random()*pool.length)];
}
function drawIt(){
  const d=S.draw; if(d==null)return null;
  if(typeof d==='number'){const q=DECK[d];if(!q||(q.hot&&!hotOn()))return null;return {it:deckItem(d),q:q}}
  const c=S.custom.find(x=>'c'+x.id===d); if(!c||(c.hot&&!hotOn()))return null;
  return {it:customItem(c),q:{cat:c.cat,hot:c.hot,o:(c.o&&c.o.length>=2)?c.o:null,mine:true}};
}
const eqAns=(it,a,b)=>done(a)&&done(b)&&a===b;
const shw=(it,v)=>typeof v==='string'?v:(it.o?it.o[v]:v);
const isCust=(it,v)=>!!it.o&&typeof v==='string';
function custForm(it,run,cur){
  return `<form class="form tform cust" data-form="tans" ${run?'data-run="1"':''} data-key="${esc(it.key)}" novalidate><input maxlength="160" autocomplete="off" placeholder="O scrivi la tua risposta" value="${esc(typeof cur==='string'?cur:'')}"><button class="btn" type="submit">Invia</button></form>`;
}
function answerBlock(it){
  const m=me(), o=other(m), mine=ans(m,it.key), th=ans(o,it.key);
  const show=v=>shw(it,v);
  if(!done(mine)){
    if(it.o)return `<div class="opts" style="--me:var(--${m==='A'?'a':'b'})">${it.o.map((x,i)=>`<button class="opt" data-act="pick" data-key="${esc(it.key)}" data-i="${i}">${esc(x)}</button>`).join('')}</div>${custForm(it,false)}`;
    return `<form class="form tform" data-form="tans" data-key="${esc(it.key)}" novalidate><input maxlength="160" autocomplete="off" placeholder="Scrivi la tua risposta"><button class="btn" type="submit">Invia</button></form>`;
  }
  if(!done(th)){
    return `<div class="pairs">${pill(m,show(mine))}</div>
     <p class="note" style="margin-top:10px">${S.mode==='local'?'Risposta salvata. Ora tocca a '+esc(nm(o))+'.':'Risposta salvata. Aspettiamo '+esc(nm(o))+'.'}</p>
     ${S.mode==='local'?`<div class="actions"><button class="btn" data-act="pass">Passa il telefono a ${esc(nm(o))}</button></div>`:''}`;
  }
  const cu=isCust(it,mine)||isCust(it,th), eq=it.o&&!cu&&eqAns(it,mine,th);
  return `<div class="pairs">${pill('A',show(ans('A',it.key)))}${pill('B',show(ans('B',it.key)))}</div>
   ${it.o?`<p class="verdict ${eq?'eq':'ne'}">${cu?'Una risposta scritta da voi: parlatene insieme':eq?heartSvg()+'Stessa risposta':xSvg+'Risposte diverse, ottimo spunto per parlarne'}</p>`:''}`;
}

/* ---------- Distanza ---------- */
function distKm(){
  const a=(S.answers.A||{}).loc, b=(S.answers.B||{}).loc; if(!a||!b)return null;
  return Math.round(hav(a.la,a.lo,b.la,b.lo));
}

/* ---------- Storie ---------- */
const activeStories=slot=>S.stories.filter(s=>s.by===slot&&Date.now()-s.at<864e5).sort((a,b)=>a.at-b.at);
function ago(t){const h=Math.floor((Date.now()-t)/36e5);return h<1?'meno di un\'ora fa':h===1?'1 ora fa':h+' ore fa'}
function avatarHTML(slot,cls){
  const a=S.answers[slot]||{}, img=safeImg(a.av);
  return `<span class="av ${slot} ${cls||''}">${img?`<img src="${img}" alt="">`:`<span>${esc((nm(slot)||'?').trim().charAt(0).toUpperCase())}</span>`}</span>`;
}
const withRing=(slot,cls)=>activeStories(slot).length?`<span class="ringy">${avatarHTML(slot,cls)}</span>`:avatarHTML(slot,cls);

/* ---------- Schermate ---------- */
function loadingHTML(){return `<div class="center">${roseSvg()}<p class="lead">${S.slow?'Non riesco a raggiungere i dati. Riprovo da solo.':'Collego Cuoricino…'}</p></div>`}
function errorHTML(){return `<div class="center"><p class="lead">Non posso leggere i dati di questa coppia. Controlla di avere accesso come collaboratore e riapri la pagina.</p></div>`}
function setupHTML(){
  const shared=S.mode==='shared';
  return `<div class="intro">${roseSvg()}<h1>Cuoricino</h1>
   <p class="lead">Quiz a due, giorni insieme, timeline, storie e giochi. Ognuno risponde per conto suo, poi si confrontano le risposte.</p></div>
  <form class="card form" data-form="setup" novalidate>
   <label for="f-a">Il tuo nome</label><input id="f-a" maxlength="24" autocomplete="off" placeholder="Anna">
   ${shared?'':'<label for="f-b">Il nome del partner</label><input id="f-b" maxlength="24" autocomplete="off" placeholder="Luca">'}
   <label for="f-since">Insieme dal</label><input id="f-since" type="date" max="${todayStr()}">
   <p class="err" id="err" role="alert" hidden></p>
   <button class="btn" type="submit">Inizia</button>
  </form>
  <p class="note">${shared?'Dopo aver creato la coppia, il partner si collega e inserisce il proprio nome: il suo profilo compare da solo qui.':'I dati restano su questo telefono. Per rispondere ai quiz vi passate il telefono.'}</p>`;
}
function computeSlot(){const ps=(S.profile&&S.profile.slots)||{};S.slot=S.slots[S.uid]||ps[S.uid]||null}
function takenByOthers(){
  const t=new Set(), all=Object.assign({},(S.profile&&S.profile.slots)||{},S.slots);
  Object.keys(all).forEach(u=>{if(u!==S.uid)t.add(all[u])}); return t;
}
function claimSlot(sl,override){
  if(override)Object.keys(S.slots).forEach(u=>{if(u!==S.uid&&S.slots[u]===sl){db.doc('slots/'+u).delete().catch(()=>{});delete S.slots[u]}});
  S.slots[S.uid]=sl; S.slot=sl;
  db.doc('slots/'+S.uid).set({s:sl,at:Date.now()}).catch(()=>toast('Non riesco a salvare la scelta.'));
}
function autoClaim(){
  if(S.mode!=='shared'||S.slot||!S.profile||!S.loadedS||!S.canWrite)return;
  const t=takenByOthers(), free=['A','B'].filter(x=>!t.has(x));
  if(free.length===1)claimSlot(free[0],false);
}
const cn=s=>((S.profile&&S.profile.names)||{})[s]||(s==='A'?'chi ha creato la coppia':'la seconda persona');
function nameHTML(){
  return headerHTML()+`<div class="intro">${roseSvg()}<h1>Come ti chiami?</h1><p class="lead">Il tuo profilo compare accanto a quello di ${esc(nm(other(me())))}: i nomi e le foto si completano da soli.</p></div>
  <form class="card form" data-form="myname" novalidate>
   <label for="f-a">Il tuo nome</label><input id="f-a" maxlength="24" autocomplete="off" placeholder="Il tuo nome">
   <label for="f-bd">Il tuo compleanno (facoltativo, per le domande speciali)</label><input id="f-bd" type="date">
   <p class="err" id="err" role="alert" hidden></p><button class="btn" type="submit">Continua</button></form>`;
}
function chooserHTML(){
  const taken=takenByOthers();
  const btn=s=>taken.has(s)
    ?`<button class="btn ghost block" data-act="slot" data-s="${s}" data-o="1">Sono ${esc(cn(s))} (nuovo telefono)</button>`
    :`<button class="btn ${s==='A'?'':'ghost'} block" data-act="slot" data-s="${s}">Sono ${esc(cn(s))}</button>`;
  const full=taken.has('A')&&taken.has('B');
  return `<div class="intro">${roseSvg()}<h1>Chi sei?</h1><p class="lead">${full?'Entrambi i posti sono già presi. Se stai cambiando telefono, scegli il tuo nome.':'Scegli il tuo nome per iniziare.'}</p></div>
  <div class="card" style="display:flex;flex-direction:column;gap:12px">${btn('A')}${btn('B')}</div>`;
}
function headerHTML(){
  const m=me();
  const chip=S.mode==='local'
    ?`<button class="chip" data-act="switch" aria-label="Cambia chi risponde"><i class="dot ${m}"></i>Risponde ${esc(nm(m))}</button>`
    :`<span class="chip"><i class="dot ${m}"></i>${esc(nm(m))}</span>`;
  return `<header class="top"><div class="brand">${markSvg(36)}<span>Cuoricino</span></div>${chip}</header>`+
    (S.canWrite?'':'<p class="banner">Hai accesso in sola lettura. Per rispondere serve l\'accesso da collaboratore.</p>');
}
const backBtn=(act,label)=>`<div class="actions" style="margin-top:0"><button class="btn ghost sm" data-act="${act||'back'}">${label||'Indietro'}</button></div>`;

/* --- Benvenuto / collegamento --- */
const fmtCode=c=>String(c||'').replace(/^(.{4})(.+)$/,'$1-$2');
function welcomeHTML(){
  const w=S.welcome||{step:'choose'};
  const hero=`<div class="hero2"><div class="logo">${markSvg(96)}</div><h1>Cuoricino</h1><p class="lead">Il vostro angolo a due: quiz, ricordi, storie e giochi.</p></div>`;
  let body;
  if(w.step==='created'){
    body=`<section class="card" style="text-align:center;display:flex;flex-direction:column;gap:12px"><p class="eyebrow">Il codice della coppia</p><div class="bigcode">${esc(fmtCode(w.code))}</div>
     <p class="note">Mandalo alla persona che ami: lo inserirà sul suo telefono per collegarsi a te.</p>
     <button class="btn" data-act="w-share">Condividi il codice</button><button class="btn ghost" data-act="w-go">Continua</button></section>`;
  }else if(w.step==='code'){
    body=`<form class="card form" data-form="join" novalidate><label for="f-code">Codice della coppia</label><input id="f-code" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" autocomplete="off" maxlength="12" placeholder="ABCD-1234">
     <p class="err" id="err" role="alert" hidden></p><button class="btn" type="submit">Collegati</button><button class="btn ghost" type="button" data-act="w-back">Indietro</button></form>`;
  }else if(cloud&&cloud.hasCouple()){
    body=`<section class="card" style="display:flex;flex-direction:column;gap:12px"><p>${esc(w.err||'Non riesco a collegarmi.')}</p><button class="btn" data-act="w-retry">Riprova</button></section>`;
  }else{
    body=`<section class="card" style="display:flex;flex-direction:column;gap:12px"><button class="btn" data-act="w-create">${heartSvg()}Crea la nostra coppia</button><button class="btn ghost" data-act="w-have">Ho un codice</button><button class="link" data-act="w-local">Usiamo un solo telefono</button>${w.err?`<p class="err">${esc(w.err)}</p>`:''}</section>`;
  }
  return hero+body;
}
async function startCloud(){
  S.mode='boot'; render(true);
  try{const id=await cloud.init(); startShared(cloud.db,{can:async()=>true},id,true)}
  catch(e){S.mode='welcome';S.welcome={step:'choose',err:'Server non raggiungibile: '+(e&&e.message||'errore')};render(true)}
}

/* --- Domande speciali --- */
const SP=D.SPECIALS;
const wday=date=>(dnum(date)+4)%7;
const lastDom=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
function spMatch(sp,date){
  if(sp.hot&&!hotOn())return false;
  const p=date.split('-').map(Number), y=p[0], m=p[1], d=p[2];
  if(sp.on)return sp.on.m===m&&sp.on.d===d;
  if(sp.weekly!==undefined)return wday(date)===sp.weekly;
  if(sp.prof){
    const st=since(), q=st.split('-').map(Number);
    if(date<=st||d!==Math.min(q[2],lastDom(y,m)))return false;
    return sp.prof==='year'?(q[1]===m&&y>q[0]):q[1]!==m;
  }
  if(sp.bday){for(const sl of ['A','B']){const bd=(S.answers[sl]||{}).bd;if(bd&&bd===pad(m)+'-'+pad(d))return sl}return false}
  return false;
}
function activeSpecials(){
  const t=todayStr(), out=[];
  SP.forEach(sp=>{for(let k=0;k<(sp.win||1);k++){const date=addDays(t,-k), r=spMatch(sp,date);if(r){out.push({sp:sp,date:date,who:typeof r==='string'?r:null});break}}});
  return out;
}
function upcomingSpecials(){
  const t=todayStr(), out=[];
  SP.forEach(sp=>{if(sp.weekly!==undefined)return;for(let k=1;k<=400;k++){const date=addDays(t,k), r=spMatch(sp,date);if(r){out.push({sp:sp,date:date,who:typeof r==='string'?r:null,days:k});break}}});
  out.sort((a,b)=>a.days-b.days); return out.slice(0,5);
}
const spSrc=a=>'special:'+a.sp.id+':'+a.date+(a.who?':'+a.who:'');
function spItems(src){
  const p=src.split(':'), sp=SP.find(x=>x.id===p[1]); if(!sp)return {title:'',items:[]};
  const date=p[2], who=p[3]||null;
  const rp=x=>x.replace(/\{N\}/g,who?nm(who):'').replace(/\{A\}/g,nm('A')).replace(/\{B\}/g,nm('B'));
  return {title:rp(sp.t),items:sp.qs.map((q,i)=>({key:'sp'+sp.id+date.replace(/-/g,'')+(who||'')+'q'+i,t:rp(q.t),o:q.o.map(rp),hot:!!sp.hot}))};
}
function specialCard(a){
  const src=spSrc(a), it=spItems(src).items, m=me(), mine=prog(it,m), both=mine===it.length&&prog(it,other(m))===it.length;
  const avs=['A','B'].map(x=>{const n=prog(it,x)===it.length;return `<span class="ca2" style="position:relative">${avatarHTML(x,'s')}${n?'<span class="ckb"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg></span>':''}</span>`}).join('');
  return `<button class="dc cs ${a.sp.hot?'hotc':''}" data-act="open" data-src="${esc(src)}"><div><span class="tg">${a.sp.weekly!==undefined?'Di oggi':'Si sblocca oggi'}</span><h3>${esc(spItems(src).title)}</h3><p style="font-size:13px;opacity:.85;margin-top:4px">${it.length} domande · ${mine}/${it.length} fatte da te</p></div><div class="ft"><span class="avs">${avs}</span><span class="go">${mine<it.length?'RISPONDI':both?'RISULTATI':'IN ATTESA'}</span></div></button>`;
}
function specialsHTML(){
  const act=activeSpecials(), up=upcomingSpecials(), t=todayStr();
  const nxt=up.map(a=>`<div class="up"><span class="lk">${lockSvg}</span><div><b>${esc(spItems(spSrc(a)).title)}</b><p class="note">${esc(fmtDate(a.date))} · tra ${pl(a.days,'giorno','giorni')}</p></div></div>`).join('');
  return `<div class="sec"><h3>Sorprese del calendario</h3></div>
   <p class="note" style="margin-top:-8px">Alcune domande si sbloccano solo in giorni speciali. Ogni venerdì e domenica ce n'è una serie nuova.</p>
   ${act.length?`<div class="dgrid">${act.map(specialCard).join('')}</div>`:'<p class="note">Oggi nessuna sorpresa in più: guarda le prossime.</p>'}
   ${nxt?`<section class="card ups">${nxt}</section>`:''}`;
}

/* --- Promemoria, avvisi, posizione --- */
function reminderHTML(){
  const t=todayStr(), m=me(), o=other(m);
  const mineD=dayDone(m,t), thD=dayDone(o,t); if(mineD&&thD)return '';
  const st=streak();
  if(!mineD)return `<button class="banner warm" data-act="daily" data-k="d" style="text-align:left;border:0;width:100%;cursor:pointer"><b>${st>0?'Non perdere la serie di '+st+(st===1?' giorno':' giorni'):'Inizia la serie di oggi'}</b><br>Rispondi alla domanda del giorno prima di mezzanotte.</button>`;
  if(st>0)return `<section class="banner warm"><b>Manca ${esc(nm(o))}</b><br>Appena risponde, la serie di ${st} ${st===1?'giorno continua':'giorni continua'}.</section>`;
  return '';
}
function hotBannerHTML(){
  const m=me(), o=other(m), mine=!!(S.answers[m]||{}).hotok, th=!!(S.answers[o]||{}).hotok;
  if(th&&!mine)return `<section class="banner warm"><b>${esc(nm(o))} vorrebbe sbloccare i contenuti hot.</b> Ci stai anche tu?<div class="actions" style="margin-top:8px"><button class="btn sm" data-act="hotok">Sì, sblocca</button></div></section>`;
  return '';
}
function notify(title,body){
  if(!S.notifOn||typeof Notification==='undefined'||Notification.permission!=='granted')return;
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body:body,icon:'icon-192.png',tag:'sintonia'})).catch(()=>{try{new Notification(title,{body:body})}catch(x){}});
    else new Notification(title,{body:body});
  }catch(e){}
}
function watchPartner(k,before){
  if(S.mode!=='shared'||!S.slot||k===S.slot||!S.watchOk)return;
  const t0=todayStr(), key=isMonthEnd(t0)?'mr'+t0.slice(0,7).replace('-','')+'q0':'d'+t0, now=S.answers[k]||{};
  if(!done(before[key])&&done(now[key])&&!dayDone(S.slot,t0)&&document.hidden)notify(nm(k)+' ha risposto','Tocca a te: rispondi alla domanda del giorno e mantieni la serie.');
}
setInterval(()=>{
  if(!S.notifOn||!me()||new Date().getHours()<19)return;
  const t=todayStr(); if(dayDone(me(),t)||lget('sint-last')===t)return;
  lset('sint-last',t); notify('Non perdere la serie','Rispondi alla domanda del giorno prima di mezzanotte.');
},60000);
function geoUpdate(force){
  if((!S.geoOn&&!force)||S.mode!=='shared'||!navigator.geolocation||!me()||!S.canWrite)return;
  try{navigator.geolocation.getCurrentPosition(pos=>{
    const la=Math.round(pos.coords.latitude*100)/100, lo=Math.round(pos.coords.longitude*100)/100, cur=(S.answers[me()]||{}).loc;
    if(!force&&cur&&Math.abs(cur.la-la)<.005&&Math.abs(cur.lo-lo)<.005&&Date.now()-(cur.at||0)<6e5)return;
    if(saveMine({loc:{n:'Posizione attuale',la:la,lo:lo,at:Date.now()}})&&force)toast('Posizione aggiornata');
    rq();
  },()=>{if(force)toast('Posizione non disponibile qui: scegli la città.')},{maximumAge:600000,timeout:8000})}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')geoUpdate()});

/* --- Home --- */
function duoHTML(){
  const m=me(), o=other(m);
  const bubble=(slot,own)=>{
    const st=(S.answers[slot]||{}).st;
    const fresh=st&&st.t&&Date.now()-st.at<864e5*2;
    if(fresh)return `<${own?'button data-act="prof"':'div'} class="bub">${esc(st.t)}</${own?'button':'div'}>`;
    return own?`<button class="bub add" data-act="prof">Il tuo stato</button>`:'';
  };
  const col=(slot,own,c)=>`<div class="bubw" style="grid-column:${c}">${bubble(slot,own)}</div>`+
    `<div class="avw" style="grid-column:${c}"><div class="avbox"><button class="avb" data-act="${own&&!activeStories(slot).length?'prof':'story'}" data-s="${slot}" aria-label="${own?'Le tue storie e il profilo':'Storie di '+esc(nm(slot))}">${withRing(slot)}</button>${own?'<button class="plus" data-act="addstory" aria-label="Aggiungi una storia">+</button>':''}</div></div>`+
    `<div class="dn" style="grid-column:${c}">${esc(nm(slot))}</div>`;
  const km=distKm();
  const dist=`<div class="mid"><button class="dist" data-act="dist" aria-label="Distanza">${km===null?lockSvg+'km':heartSvg('hk')+(km<1?'meno di 1':km.toLocaleString('it-IT'))+' km'}</button></div>`;
  return `<section class="duo">${col(m,true,1)}${dist}${col(o,false,3)}</section>`;
}
function streakChip(n){
  const f=Math.min(n,7)/7, P='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const fire=n>=30?'🔥🔥':n>=7?'🔥':'';
  return `<span class="streak ${n>=7?'hot':''}" title="Giorni di fila con risposta di entrambi: il cuore si riempie in 7 giorni, poi arriva il fuoco"><svg class="skh" viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id="skc"><rect x="0" y="${(24*(1-f)).toFixed(1)}" width="24" height="24"/></clipPath></defs><path d="${P}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="${P}" fill="currentColor" clip-path="url(#skc)"/></svg>${n}${fire?`<span class="fire">${fire}</span>`:''}</span>`;
}
function dailyCount(){
  const A=S.answers.A||{}, B=S.answers.B||{}; let n=0;
  Object.keys(A).forEach(k=>{
    if(/^d\d{4}-\d\d-\d\d$/.test(k)&&done(A[k])&&done(B[k]))n++;
    const m=/^mr(\d{4})(\d\d)q0$/.exec(k);
    if(m){const it=recapItems(m[1]+'-'+m[2]);if(it.every(x=>done(A[x.key])&&done(B[x.key])))n++}
  });
  return n;
}
function statsHTML(){
  const t=todayStr(), n=dnum(t)-dnum(since());
  const a=n<0?`<b>${-n}</b><span>${n===-1?'giorno all\'inizio':'giorni all\'inizio'}</span>`:`<b>${n}</b><span>${n===1?'giorno':'giorni'} insieme</span>`;
  const dc=dailyCount();
  return `<section class="stats"><div class="stat">${a}</div><div class="stat"><b>${dc}</b><span>${dc===1?'risposta':'risposte'} alla domanda del giorno</span></div></section>`;
}
function dailyCards(){
  const t=todayStr(), m=me(), on=hotOn();
  const sd=dailyItem('d',t), sw=dailyItem('w',t), sx=dailyItem('x',t), me_=isMonthEnd(t);
  const avs=it=>['A','B'].map(s=>`<span class="ca2" style="position:relative">${avatarHTML(s,'s')}${done(ans(s,it.key))?'<span class="ckb"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg></span>':''}</span>`).join('');
  const foot=(it,locked)=>{
    if(locked)return `<span class="go">${lockSvg}SBLOCCA</span>`;
    const mine=done(ans(m,it.key)), both=mine&&done(ans(other(m),it.key));
    return `<span class="go">${both?'RISULTATI':mine?'IN ATTESA':'RISPONDI'}</span>`;
  };
  const card=(cls,k,it,title,tag,locked,hint)=>`<button class="dc ${cls} ${locked?'lock':''}" data-act="daily" data-k="${k}" ${hint?'data-hint="'+hint+'"':''}>
    <div>${tag?`<span class="tg">${tag}</span>`:''}<h3>${title}</h3></div>
    <div class="ft"><span class="avs">${avs(it)}</span>${foot(it,locked)}</div></button>`;
  const lockW=!dayDone(m,t);
  const recapCard=()=>{const src='month:'+t.slice(0,7), it=srcOf(src).items, mine=prog(it,m), both=mine===it.length&&prog(it,other(m))===it.length;
    const av=['A','B'].map(x=>`<span class="ca2" style="position:relative">${avatarHTML(x,'s')}${prog(it,x)===it.length?'<span class="ckb"><svg viewBox="0 0 12 12"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg></span>':''}</span>`).join('');
    return `<button class="dc c1" data-act="open" data-src="${src}"><div><span class="tg">Fine mese</span><h3>Resoconto<br>del mese</h3></div><div class="ft"><span class="avs">${av}</span><span class="go">${both?'RISULTATI':mine===it.length?'IN ATTESA':mine+'/'+it.length}</span></div></button>`};
  const lockX=!on||!done(ans(m,sw.key));
  const g=S.game;
  return `<div class="dgrid">
    ${me_?recapCard():card('c1','d',sd,'Domanda<br>del giorno','',false)}
    ${card('c2','w',sw,'Chi è più<br>probabile?','',lockW,'prev')}
    ${card('c3','x',sx,'Conversazione','18+',lockX,on?'prev':'hot')}
    ${activeSpecials().map(specialCard).join('')}
    <button class="dc cg" data-tab="giochi"><div><h3>Sfida<br>di coppia</h3></div><div class="ft"><span class="avs">${avatarHTML('A','s')}${'<span class="ca2" style="position:relative">'+avatarHTML('B','s')+'</span>'}</span><span class="go">${g&&!g.w?'CONTINUA':'GIOCA'}</span></div></button>
  </div>`;
}
function notesHTML(){
  const m=me(), o=other(m), on=(S.answers[o]||{}).note, mn=(S.answers[m]||{}).note;
  const theirs=on&&on.t?`<div class="nc"><span class="who">${esc(nm(o))}</span><p>${esc(on.t)}</p></div>`:`<div class="nc" style="cursor:default"><span class="who">${esc(nm(o))}</span><p class="muted">Nessuna nota, per ora.</p></div>`;
  const mine=mn&&mn.t?`<button class="nc mine" data-act="prof"><span class="who">Tu</span><p>${esc(mn.t)}</p></button>`:`<button class="nc add" data-act="prof">+ Scrivi una nota</button>`;
  return `<div class="nwrap">${theirs}${mine}</div>`;
}
function homeHTML(){
  if(S.view&&S.view.t==='daily')return dailyHTML();
  if(S.view&&S.view.t==='prof')return profHTML();
  if(S.view&&S.view.t==='story')return storyHTML();
  const streakN=streak();
  return headerHTML()+duoHTML()+statsHTML()+reminderHTML()+hotBannerHTML()+
   `<div class="sec"><div><h3>Attività quotidiane</h3><p class="timer">Prossimo in <span id="cd">${cdText()}</span></p></div>${streakChip(streakN)}</div>`+
   dailyCards()+`<div class="sec"><h3>Note</h3></div>`+notesHTML()+hdiv();
}
function cdText(){
  const n=new Date(), e=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1), s=Math.max(0,Math.floor((e-n)/1000));
  return pad(Math.floor(s/3600))+':'+pad(Math.floor(s%3600/60))+':'+pad(s%60);
}
setInterval(()=>{const el=document.getElementById('cd');if(el)el.textContent=cdText()},1000);

function dailyHTML(){
  const k=S.view.k, it=dailyItem(k,todayStr());
  const title=k==='d'?'Domanda del giorno':k==='w'?'Chi è più probabile?':'Conversazione 18+';
  return headerHTML()+`<section class="card"><div class="qhead"><p class="eyebrow">${title}</p>${k==='x'?'<span class="tag hot" style="margin:0">18+</span>':''}</div>
   <h2 class="qtext">${esc(it.t)}</h2>${answerBlock(it)}</section>${done(ans('A',it.key))&&done(ans('B',it.key))?chatHTML(it.key,'Parlatene insieme'):''}${backBtn('back','Torna alla home')}`;
}
function profHTML(){
  const m=me(), a=S.answers[m]||{}, ns=activeStories(m).length;
  const presets=D.STATUS.concat(hotOn()?D.STATUS_HOT:[]);
  return headerHTML()+`<h2 class="h2">Il tuo profilo</h2>
  <section class="card" style="display:flex;flex-direction:column;gap:14px;align-items:flex-start">
    <div style="display:flex;align-items:center;gap:14px">${avatarHTML(m,'m')}<div><p style="font-weight:700">${esc(nm(m))}</p><button class="link" data-act="avpick" style="min-height:32px">Cambia foto profilo</button></div></div>
  </section>
  <section class="card"><p class="eyebrow" style="margin-bottom:10px">Stato (resta visibile 48 ore)</p>
   <div class="chips">${presets.map((p,i)=>`<button class="chip" data-act="setst" data-i="${i}">${esc(p)}</button>`).join('')}</div>
   <form class="form tform" data-form="status" novalidate style="margin-top:12px"><input id="f-st" data-d="st" maxlength="40" autocomplete="off" placeholder="Scrivi il tuo stato" value="${esc(S.st)}"><button class="btn" type="submit">Imposta</button></form>
   ${a.st&&a.st.t?'<div class="actions"><button class="btn ghost sm" data-act="clrst">Togli lo stato</button></div>':''}
  </section>
  <section class="card"><form class="form" data-form="note" novalidate><p class="eyebrow">Nota per ${esc(nm(other(m)))}</p>
   <textarea id="f-nt" data-d="nt" maxlength="200" placeholder="Una frase per il tuo partner">${esc(S.nt)}</textarea>
   <button class="btn" type="submit">Salva la nota</button></form></section>
  <section class="card form"><p class="eyebrow">Storia (dura 24 ore)</p>
   <input id="f-sc" data-d="storyTxt" maxlength="100" autocomplete="off" placeholder="Didascalia (facoltativa)" value="${esc(S.storyTxt)}">
   <button class="btn" data-act="storypick" type="button">${heartSvg()}Scegli la foto e pubblica</button>
   ${ns?`<button class="btn ghost" type="button" data-act="story" data-s="${m}">Vedi le mie storie (${ns})</button>`:''}</section>${backBtn('back','Torna indietro')}`;
}
function storyHTML(){
  const slot=S.view.s, list=activeStories(slot);
  if(!list.length)return headerHTML()+`<section class="card empty">${roseSvg()}<p>Nessuna storia attiva di ${esc(nm(slot))}.</p></section>${backBtn('back','Torna indietro')}`;
  const i=Math.min(S.view.i||0,list.length-1), st=list[i], own=st.by===me();
  const segs=list.map((_,j)=>`<span class="seg ${j<i?'done':''} ${j===i?'cur':''}"></span>`).join('');
  return headerHTML()+`<section class="card sv"><div class="segs" style="margin-bottom:0">${segs}</div>
   <div style="display:flex;align-items:center;gap:10px">${avatarHTML(slot,'s')}<div><b>${esc(nm(slot))}</b><br><span class="note">${ago(st.at)}</span></div></div>
   <img src="${safeImg(st.img)}" alt="Storia di ${esc(nm(slot))}" data-act="snext">
   ${st.text?`<p class="cap">${esc(st.text)}</p>`:''}
   <div class="actions" style="margin-top:0">${i>0?'<button class="btn ghost sm" data-act="sprev">Indietro</button>':''}${i<list.length-1?'<button class="btn sm" data-act="snext">Avanti</button>':''}${activeStories(other(slot)).length?`<button class="btn ghost sm" data-act="story" data-s="${other(slot)}">Storie di ${esc(nm(other(slot)))}</button>`:''}${own?'<button class="btn ghost sm" data-act="prof">Nuova storia</button>':''}${own?`<button class="btn ghost sm" data-act="sdel" data-id="${esc(st.id)}">Elimina</button>`:''}<button class="btn ghost sm" data-act="back">Chiudi</button></div></section>`;
}

/* --- Quiz --- */
function quizHTML(){
  const v=S.view;
  if(v){if(v.t==='run')return runHTML();if(v.t==='res')return resHTML();if(v.t==='addq')return addqHTML()}
  return headerHTML()+`<h2 class="h2">Quiz</h2>`+deckHTML()+specialsHTML()+quickHTML()+customHTML()+packsHTML();
}
function deckHTML(){
  const on=hotOn(); let cat=S.deckCat||'all'; if(isHot(cat)&&!on)cat='all';
  const pool=allowedDeck(cat).length+customPool(cat).length;
  const dr=drawIt(); let body;
  if(!dr){
    body=`<p class="note">Una domanda a caso, uguale per tutti e due. Pescatene quante ne volete.</p>
     <div class="actions"><button class="btn" data-act="draw">${heartSvg()}Pesca una domanda</button></div>`;
  }else{
    const it=dr.it, q=dr.q, both=done(ans('A',it.key))&&done(ans('B',it.key));
    const kind=q.mine?(q.o?'Vostra':'Vostra · risposta libera'):q.who?'Chi dei due?':!q.o?'Risposta libera':q.t==='Preferisci…'?'Preferisci':'Sinceramente', ctag=(!q.hot&&q.cat)?dcatName(q.cat):'';
    body=`<span class="tag ${q.hot?'hot':''}">${q.hot?'Hot · ':''}${esc(kind)}${ctag?' · '+esc(ctag):''}</span><h3 class="qtext">${esc(it.t)}</h3>${answerBlock(it)}
     <div class="actions"><button class="btn ${both?'':'ghost'}" data-act="draw">${heartSvg()}${both?'Pesca un\'altra':'Salta'}</button></div>`;
  }
  const total=DECK.filter(q=>!q.hot).length+S.custom.filter(c=>!c.hot).length;
  return `<section class="card"><div class="qhead"><div><h3 style="font-size:22px">Il mazzo</h3><p class="note">${total} domande${on?' + '+(DECK.filter(q=>q.hot).length+S.custom.filter(c=>c.hot).length)+' hot':''} · ${pool} in "${esc(dcatName(cat))}" · comprese le vostre</p></div></div>
   <label class="selw"><span class="eyebrow">Categoria</span><select data-sel="deckcat" aria-label="Categoria del mazzo">${DCATS.map(c=>`<option value="${c[0]}" ${cat===c[0]?'selected':''}>${isHot(c[0])&&!on?'Hot 18+ (bloccato)':esc(c[1])}</option>`).join('')}</select></label>${body}</section>${dr&&done(ans('A',dr.it.key))&&done(ans('B',dr.it.key))?chatHTML(dr.it.key,'Parlatene insieme'):''}`;
}
function quickHTML(){
  const ns=[5,10,20,30], on=hotOn(), q=S.quick&&S.quick.ids&&S.quick.ids.length;
  let cur='';
  if(q){
    const it=srcOf('quick').items, m=me(), a=prog(it,'A'), b=prog(it,'B'), mine=prog(it,m);
    cur=`<div class="bars" style="margin-top:12px"><div class="bar"><span class="nm">${esc(nm('A'))}</span><span class="track"><i style="width:${a/it.length*100}%"></i></span><span class="n">${a}/${it.length}</span></div>
     <div class="bar"><span class="nm">${esc(nm('B'))}</span><span class="track B"><i style="width:${b/it.length*100}%"></i></span><span class="n">${b}/${it.length}</span></div></div>
     <div class="actions"><button class="btn" data-act="open" data-src="quick">${mine===0?'Inizia':mine<it.length?'Continua':'Rivedi risultati'}</button><button class="btn ghost" data-act="res" data-src="quick">Risultati</button></div>`;
  }
  return `<section class="card"><h3 style="font-size:22px">Quiz rapido</h3><p class="note" style="margin:2px 0 12px">Scegliete la lunghezza: domande a caso dal mazzo, nella categoria scelta qui sopra (${esc(dcatName(isHot(S.deckCat)?'all':(S.deckCat||'all')))}).</p>
   <div class="chips">${ns.map(n=>`<button class="chip ${S.quickN===n?'on':''}" data-act="quickn" data-n="${n}">${n}</button>`).join('')}${on?`<button class="chip ${S.quickHot?'on':''}" data-act="quickhot">Hot 18+</button>`:''}</div>
   <div class="actions"><button class="btn" data-act="quicknew">${heartSvg()}Crea ${S.quickN} domande</button></div>${cur}</section>`;
}
function customHTML(){
  const on=hotOn(), list=S.custom.filter(c=>!c.hot||on), m=me();
  const rows=list.map(c=>{
    const it=customItem(c);
    return `<article class="card"><span class="tag ${c.hot?'hot':''}">${c.hot?'Hot · ':''}di ${esc(nm(c.by))}${it.o?'':' · risposta libera'}</span><h3 class="qtext">${esc(c.t)}</h3>${answerBlock(it)}
      ${c.by===m?`<div class="actions"><button class="btn ghost sm" data-act="delq" data-id="${esc(c.id)}">Elimina la domanda</button></div>`:''}</article>${done(ans('A',it.key))&&done(ans('B',it.key))?chatHTML(it.key,'Parlatene insieme'):''}`;
  }).join('');
  return `<div class="sec"><h3>Le vostre domande</h3><button class="btn sm" data-act="addq">+ Aggiungi</button></div>
   ${rows||'<p class="note" style="margin-top:-6px">Scrivete le domande che volete: a scelta multipla oppure a risposta libera.</p>'}`;
}
const PCATS=[['all','Tutti'],['conoscersi','Conoscerci'],['quotidiano','Ogni giorno'],['futuro','Futuro'],['ricordi','Ricordi'],['gioco','Per gioco'],['stagione','Stagioni'],['hot','Hot 18+']];
const MONTHS=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const bestStreak=()=>Math.max(streak(),+(S.answers.A||{}).maxst||0,+(S.answers.B||{}).maxst||0);
const daysTogether=()=>dnum(todayStr())-dnum(since());
function packsDone(){return D.PACKS.filter(p=>{const it=srcOf('pack:'+p.id).items;return prog(it,'A')===it.length&&prog(it,'B')===it.length}).length}
function lockHint(p){
  const u=p.unlock; if(!u)return null;
  const it=srcOf('pack:'+p.id).items; if(prog(it,'A')+prog(it,'B')>0)return null;
  if(u.days&&daysTogether()<u.days)return `Si sblocca dopo ${u.days} giorni insieme (ne mancano ${u.days-daysTogether()})`;
  if(u.streak&&bestStreak()<u.streak)return `Si sblocca con ${u.streak} giorni di fila rispondendo alla domanda del giorno (ora: ${bestStreak()})`;
  if(u.packs&&packsDone()<u.packs)return `Si sblocca dopo ${u.packs} quiz completati da entrambi (ora: ${packsDone()})`;
  if(u.months&&u.months.indexOf(new Date().getMonth()+1)<0)return `Si sblocca in ${u.months.map(x=>MONTHS[x-1]).join(', ')}`;
  return null;
}
function packsHTML(){
  const m=me(), on=hotOn(), pc=S.pcat||'all';
  const card=p=>{
    const it=srcOf('pack:'+p.id).items, tot=it.length, a=prog(it,'A'), b=prog(it,'B'), mine=prog(it,m);
    const label=mine===0?'Inizia':mine<tot?'Continua':'Rivedi risultati', act=mine<tot?'open':'res';
    return `<article class="card pack ${p.hot?'hot':''}"><h3>${heartSvg()}${esc(p.title)}${p.hot?' <span class="tag hot" style="margin:0">18+</span>':''}</h3><p class="blurb">${esc(p.blurb)} <b>${tot} domande.</b></p>
     <div class="bars"><div class="bar"><span class="nm">${esc(nm('A'))}</span><span class="track"><i style="width:${a/tot*100}%"></i></span><span class="n">${a}/${tot}</span></div>
     <div class="bar"><span class="nm">${esc(nm('B'))}</span><span class="track B"><i style="width:${b/tot*100}%"></i></span><span class="n">${b}/${tot}</span></div></div>
     <div class="actions"><button class="btn" data-act="${act}" data-src="pack:${p.id}">${label}</button>${mine>0&&mine<tot?`<button class="btn ghost" data-act="res" data-src="pack:${p.id}">Risultati</button>`:''}</div></article>`;
  };
  const lockc=(p,h)=>`<article class="card lockcard">${lockSvg}<div><b>${esc(p.title)}</b><p class="note">${esc(h)}</p></div></article>`;
  const list=pc==='hot'?[]:D.PACKS.filter(p=>pc==='all'||p.cat===pc);
  const open=[], shut=[];
  list.forEach(p=>{const h=lockHint(p);if(h)shut.push(lockc(p,h));else open.push(card(p))});
  let hotPart='';
  if(pc==='all'||pc==='hot')hotPart=on?D.HOTPACKS.map(card).join(''):`<article class="card lockcard">${lockSvg}<div><b>Quiz hot 18+</b><p class="note">Si sbloccano quando lo vogliono entrambi: sezione Noi.</p></div></article>`;
  const chips=`<div class="chips" style="margin:6px 0 14px">${PCATS.map(c=>`<button class="chip ${pc===c[0]?'on':''}" data-act="pcat" data-c="${c[0]}">${c[1]}</button>`).join('')}</div>`;
  return `<h3 style="font-size:22px">Quiz completi</h3><p class="note" style="margin-top:-8px">${D.PACKS.length+D.HOTPACKS.length} quiz di argomenti e lunghezze diverse. Alcuni si sbloccano con il tempo, la serie o in certe stagioni. Le risposte dell'altro si vedono solo dopo aver risposto.</p>${chips}
   <div class="packs">${open.join('')}${hotPart}</div>${shut.length?`<div class="sec"><h3>Da sbloccare</h3></div><div class="packs">${shut.join('')}</div>`:''}`;
}
function runHTML(){
  const src=srcOf(S.view.src), items=src.items, i=S.view.i, it=items[i], m=me(), cur=ans(m,it.key);
  const segs=items.map((_,j)=>`<span class="seg ${j<i?'done':''} ${j===i?'cur':''}"></span>`).join('');
  const body=it.o
    ?`<div class="opts">${it.o.map((x,k)=>`<button class="opt ${cur===k?'sel':''}" data-act="ans" data-i="${k}">${esc(x)}</button>`).join('')}</div>${custForm(it,true,cur)}`
    :`<form class="form tform" data-form="tans" data-run="1" data-key="${esc(it.key)}" novalidate><input maxlength="160" autocomplete="off" placeholder="Scrivi la tua risposta" value="${esc(typeof cur==='string'?cur:'')}"><button class="btn" type="submit">Invia</button></form>`;
  return headerHTML()+`<section class="card run ${m}"><div class="qhead"><p class="eyebrow">${esc(src.title)} · ${i+1} di ${items.length}</p></div>
   <div class="segs" aria-hidden="true">${segs}</div><h2 class="qtext">${esc(it.t)}</h2>${body}
   <div class="actions">${i>0?'<button class="btn ghost" data-act="prev">Indietro</button>':''}<button class="btn ghost" data-act="back">Esci</button></div></section>`;
}
function ringSvg(pct){
  const d=6+86*(1-pct), cx1=100-d/2, cx2=100+d/2, s=76;
  return `<svg class="ring" viewBox="0 0 200 90" role="img" aria-label="${Math.round(pct*100)}% di sintonia"><use href="#heart" x="${cx1-s/2}" y="6" width="${s}" height="${s}" class="ca" style="fill-opacity:.85"/><use href="#heart" x="${cx2-s/2}" y="6" width="${s}" height="${s}" class="cb" style="fill-opacity:.8"/></svg>`;
}

/* ---------- Discussione ---------- */
const thMsgs=th=>S.chat.filter(c=>c.th===th).sort((a,b)=>a.at-b.at);
const msgTime=t=>{try{return new Date(t).toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
function chatHTML(th,title){
  const ms=thMsgs(th), m=me();
  const list=ms.length?ms.map(c=>`<div class="msg ${c.by} ${c.by===m?'mine':''}"><span class="who">${esc(nm(c.by))} · ${esc(msgTime(c.at))}</span><p>${esc(c.t)}</p></div>`).join('')
    :'<p class="note">Nessun messaggio, per ora. Cominciate voi: com\'è andata? Vi aspettavate la stessa risposta?</p>';
  return `<section class="card chat"><h3 style="font-size:20px">${esc(title||'Discussione')}</h3><div class="msgs">${list}</div>
   <form class="form tform" data-form="chat" data-th="${esc(th)}" novalidate><input maxlength="300" autocomplete="off" placeholder="Scrivi un messaggio"><button class="btn" type="submit">Invia</button></form></section>`;
}
function chatNotify(old){
  if(!old||!S.watchOk)return;
  const ids=new Set(old.map(c=>c.id)), m=me();
  S.chat.forEach(c=>{if(!ids.has(c.id)&&c.by!==m&&Date.now()-c.at<6e4)notify(nm(c.by),c.t)});
}
function resHTML(){
  const src=srcOf(S.view.src), m=me(), o=other(m); let cmp=0, same=0; const diff=[];
  const rows=src.items.map(it=>{
    const mine=ans(m,it.key), th=ans(o,it.key), show=v=>shw(it,v);
    if(!done(mine))return `<article class="card qrow"><p class="qt">${esc(it.t)}</p><p class="note">Rispondi per vedere cosa ha scelto ${esc(nm(o))}.</p></article>`;
    const both=done(th); let eq=false, cu=false;
    if(both&&it.o){cu=isCust(it,mine)||isCust(it,th); if(!cu){cmp++;eq=mine===th;if(eq)same++}; if(!eq)diff.push(it)}
    const a=m==='A'?mine:th, b=m==='B'?mine:th;
    return `<article class="card qrow"><p class="qt">${esc(it.t)}</p><div class="pairs">${done(a)?pill('A',show(a)):pill('A','',true)}${done(b)?pill('B',show(b)):pill('B','',true)}</div>
      ${both&&it.o?`<p class="verdict ${eq?'eq':'ne'}">${cu?'Risposta scritta da voi':eq?heartSvg()+'Uguale':xSvg+'Diverso'}</p>`:''}</article>`;
  }).join('');
  const pct=cmp?same/cmp:0, n=src.items.length, pa=prog(src.items,'A'), pb=prog(src.items,'B');
  const sum=cmp?`${ringSvg(pct)}<div class="rc"><div class="pct">${Math.round(pct*100)}%</div><p class="sub">${same} risposte uguali su ${cmp}</p></div>`
    :`${ringSvg(0)}<div class="rc"><p class="sub">Nessuna risposta in comune da confrontare, per ora.</p></div>`;
  const doneO=pb===n&&pa===n;
  const pass=S.mode==='local'&&prog(src.items,o)<n?`<button class="btn" data-act="pass">Passa il telefono a ${esc(nm(o))}</button>`:'';
  const status=doneO?'Completato da entrambi.':`${esc(nm('A'))} ${pa}/${n} · ${esc(nm('B'))} ${pb}/${n}`;
  const disc=diff.length?`<section class="card"><p class="eyebrow">Da discutere</p><ul class="dlist">${diff.map(it=>`<li>${esc(it.t)}</li>`).join('')}</ul></section>`:'';
  return headerHTML()+`<h2 class="h2">${esc(src.title)}</h2><section class="card"><p class="eyebrow">Resoconto per entrambi</p>${sum}<p class="note" style="text-align:center;margin-top:6px">${status}</p><div class="actions" style="justify-content:center">${pass}<button class="btn ghost" data-act="back">Torna ai quiz</button></div></section>${disc}${prog(src.items,m)>0?chatHTML(S.view.src,'Discussione sul quiz'):''}${rows}`;
}
function addqHTML(){
  const on=hotOn(), q=S.cq||{t:'',o:'',hot:false};
  return headerHTML()+`<h2 class="h2">Nuova domanda</h2>
  <form class="card form" data-form="addq" novalidate>
   <label for="f-qt">La domanda</label><input id="f-qt" data-d="cq.t" maxlength="140" autocomplete="off" placeholder="Qual è il tuo posto preferito?" value="${esc(q.t)}">
   <label for="f-qo">Opzioni (una per riga, da 2 a 6). Se le lasci vuote la risposta è libera.</label>
   <textarea id="f-qo" data-d="cq.o" placeholder="Mare&#10;Montagna&#10;Città">${esc(q.o)}</textarea>
   <label for="f-qc">Categoria (la domanda entra nel mazzo di quella categoria e potete pescarla di nuovo)</label>
   <select id="f-qc" data-d="cq.cat">${DCATS.filter(c=>c[0]!=='all'&&!isHot(c[0])).map(c=>`<option value="${c[0]}" ${(q.cat||'know')===c[0]?'selected':''}>${esc(c[1])}</option>`).join('')}</select>
   <label class="chk"><input type="checkbox" data-d="cq.hot" ${q.hot&&on?'checked':''} ${on?'':'disabled'}>Domanda hot 18+ ${on?'':'(si sblocca in Noi)'}</label>
   <p class="err" id="err" role="alert" hidden></p>
   <button class="btn" type="submit">Aggiungi la domanda</button>
  </form>${backBtn('back','Annulla')}`;
}

const cityDL=()=>`<datalist id="cities">${CITIES.map(c=>`<option value="${esc(c[0])}"></option>`).join('')}</datalist>`;

/* --- Mappa delle foto --- */
const mapPins=()=>{
  const out=[];
  S.events.filter(e=>!e.hot||hotOn()).forEach(e=>{if(e.gp)out.push({coll:'events',id:e.id,la:e.gp.la,lo:e.gp.lo,th:evThs(e)[0],by:e.by,n:evThs(e).length})});
  return out;
};
const mx=(lo,z)=>(lo+180)/360*Math.pow(2,z)*256;
const my=(la,z)=>{la=Math.max(-85,Math.min(85,la));const s=Math.sin(la*Math.PI/180);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*Math.pow(2,z)*256};
let mapDrag=false;
function mapFit(ps,W,H){
  let z=16;
  for(;z>2;z--){
    const xs=ps.map(p=>mx(p.lo,z)), ys=ps.map(p=>my(p.la,z));
    if(Math.max(...xs)-Math.min(...xs)<W-90&&Math.max(...ys)-Math.min(...ys)<H-90)break;
  }
  if(ps.length===1)z=Math.min(z,13);
  const xs=ps.map(p=>mx(p.lo,z)), ys=ps.map(p=>my(p.la,z));
  return {z:z,cx:(Math.max(...xs)+Math.min(...xs))/2,cy:(Math.max(...ys)+Math.min(...ys))/2};
}
function mapDraw(){
  const box=document.getElementById('mapbox'); if(!box||!S.map)return;
  const layer=box.querySelector('.mlayer'), W=box.clientWidth, H=box.clientHeight, m=S.map, z=m.z, n=Math.pow(2,z);
  const left=m.cx-W/2, top=m.cy-H/2; let h='';
  for(let ty=Math.floor(top/256);ty<=Math.floor((top+H)/256);ty++){
    if(ty<0||ty>=n)continue;
    for(let tx=Math.floor(left/256);tx<=Math.floor((left+W)/256);tx++){
      h+=`<img class="mt" alt="" draggable="false" src="https://tile.openstreetmap.org/${z}/${((tx%n)+n)%n}/${ty}.png" style="left:${Math.round(tx*256-left)}px;top:${Math.round(ty*256-top)}px">`;
    }
  }
  mapPins().forEach(p=>{
    const x=mx(p.lo,z)-left, y=my(p.la,z)-top; if(x<-30||y<-30||x>W+30||y>H+30)return;
    const im=safeImg(p.th);
    h+=`<button class="mpin ${p.by==='B'?'B':''}" data-act="mappin" data-coll="${p.coll}" data-id="${esc(p.id)}" style="left:${Math.round(x)}px;top:${Math.round(y)}px" aria-label="Apri il ricordo">${im?`<img src="${im}" alt="">`:heartSvg('hk')}${p.n>1?`<b class="mn">${p.n}</b>`:''}</button>`;
  });
  layer.innerHTML=h;
  layer.querySelectorAll('img.mt').forEach(i=>i.addEventListener('error',()=>{i.remove();const hn=document.getElementById('maphint');if(hn)hn.hidden=false}));
}
function mapZoom(d){
  const m=S.map; if(!m)return; const nz=Math.max(2,Math.min(17,m.z+d)); if(nz===m.z)return;
  const f=Math.pow(2,nz-m.z); m.cx*=f; m.cy*=f; m.z=nz; mapDraw();
}
function mapMount(){
  const box=document.getElementById('mapbox'); if(!box)return;
  const ps=mapPins(), W=box.clientWidth||340, H=box.clientHeight||360;
  if(!S.map||S.map.n!==ps.length){S.map=Object.assign(mapFit(ps,W,H),{n:ps.length})}
  mapDraw();
  let st=null;
  box.addEventListener('pointerdown',e=>{if(e.target.closest('.mctl'))return;st={x:e.clientX,y:e.clientY,cx:S.map.cx,cy:S.map.cy,moved:false}});
  box.addEventListener('pointermove',e=>{
    if(!st)return; const dx=e.clientX-st.x, dy=e.clientY-st.y;
    if(!st.moved&&Math.hypot(dx,dy)>5){st.moved=true;mapDrag=true}
    if(st.moved){S.map.cx=st.cx-dx;S.map.cy=st.cy-dy;if(!st.raf)st.raf=requestAnimationFrame(()=>{st&&(st.raf=0);mapDraw()})}
  });
  const end=()=>{st=null;setTimeout(()=>{mapDrag=false},80)};
  box.addEventListener('pointerup',end); box.addEventListener('pointercancel',end); box.addEventListener('pointerleave',()=>{if(st&&st.moved)end()});
  box.addEventListener('wheel',e=>{e.preventDefault();mapZoom(e.deltaY<0?1:-1)},{passive:false});
}
function mapHTML(){
  const ps=mapPins(), vis=S.events.filter(e=>!e.hot||hotOn()), nogps=vis.filter(e=>!e.gp).length;
  if(!ps.length)return `<section class="card empty">${roseSvg()}<h3>La vostra mappa</h3><p class="note">I momenti della timeline che hanno un luogo compaiono qui, con le loro foto. Quando aggiungi un momento scegli la città oppure aggiungi una foto con il luogo: lo leggo da solo.</p></section>${nogps?`<p class="note">${nogps} ${nogps===1?'momento senza luogo':'momenti senza luogo'}: aprili dalla timeline e assegna una città.</p>`:''}`;
  const places=new Set(ps.map(p=>placeName({la:p.la,lo:p.lo}))).size;
  return `<div id="mapbox" class="mapbox"><div class="mlayer"></div>
   <div class="mctl"><button class="chip" data-act="mapz" data-d="1" aria-label="Ingrandisci">+</button><button class="chip" data-act="mapz" data-d="-1" aria-label="Riduci">−</button></div>
   <span class="mattr">© OpenStreetMap</span></div>
   <p class="note" id="maphint" hidden>Non riesco a caricare lo sfondo della mappa qui: vedi comunque i punti nei luoghi giusti.</p>
   <p class="note">${ps.length} ${ps.length===1?'momento':'momenti'} in ${places} ${places===1?'luogo':'luoghi'}. Tocca un punto per aprire il ricordo, trascina per spostarti.${nogps?` ${nogps} ${nogps===1?'momento è senza luogo':'momenti sono senza luogo'}: aprili dalla timeline per assegnarlo.`:''}</p>`;
}

/* --- Ricordi --- */
function milestones(){
  const s=since(), t=todayStr(), n=dnum(t)-dnum(s), out=[], fut=[];
  const add=(date,title)=>{(dnum(date)>dnum(t)?fut:out).push({auto:true,date:date,title:title,at:0})};
  add(s,'Il nostro inizio');
  [50,100,200,300,500,1000,1500,2000,3000].forEach(d=>add(addDays(s,d),pl(d,'giorno','giorni')+' insieme'));
  const p=s.split('-'); for(let y=1;y<=30;y++)add((+p[0]+y)+'-'+p[1]+'-'+p[2],pl(y,'anno','anni')+' insieme');
  fut.sort((a,b)=>dnum(a.date)-dnum(b.date));
  return out.concat(fut.slice(0,1).map(f=>Object.assign({},f,{fut:true})));
}
function ricordiHTML(){
  if(S.view&&S.view.t==='addev')return addevHTML();
  if(S.photoView)return photoViewHTML();
  if(S.view&&S.view.t==='story')return storyHTML();
  if(S.view&&S.view.t==='prof')return profHTML();
  const m=me(), o=other(m), on=hotOn();
  const nA=activeStories(m).length+activeStories(o).length;
  const stories=`<div class="stories one"><button class="bigheart ${nA?'live':''}" data-act="stog" aria-label="Storie di ${esc(nm('A'))} e ${esc(nm('B'))}"><span class="hrt3"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#heart"/></svg><span class="ia">${avatarHTML('A','l')}${avatarHTML('B','l')}</span></span><span class="hn"><b>${esc(nm('A'))}</b> <i>&amp;</i> <b>${esc(nm('B'))}</b></span>${nA?`<span class="note">${nA===1?'1 storia attiva':nA+' storie attive'}: tocca per vederle</span>`:'<span class="note">Tocca per pubblicare una storia</span>'}</button></div>`;
  const seg=`<div class="seg2"><button data-act="rtab" data-v="time" aria-pressed="${S.rtab==='time'}">Timeline</button><button data-act="rtab" data-v="map" aria-pressed="${S.rtab==='map'}">Mappa</button></div>`;
  return headerHTML()+`<h2 class="h2">Ricordi</h2>${stories}${seg}`+(S.rtab==='map'?mapHTML():timelineHTML(on));
}
function timelineHTML(on){
  const items=S.events.filter(e=>!e.hot||on).map(e=>Object.assign({},e)).concat(milestones());
  items.sort((a,b)=>b.date.localeCompare(a.date)||(b.at||0)-(a.at||0));
  const t=todayStr();
  const li=items.map(e=>{
    if(e.auto)return `<li class="tli"><i class="tdot ${e.fut?'fut':'auto'}"></i><div class="tc auto"><p class="td">${e.fut?'Prossima tappa · tra '+pl(dnum(e.date)-dnum(t),'giorno','giorni'):esc(fmtDate(e.date))}</p><h3>${esc(e.title)}</h3></div></li>`;
    const ths=evThs(e).map(safeImg).filter(Boolean);
    const phs=ths.length?`<div class="tphs n${ths.length}">${ths.map((im,k)=>`<button class="tph" data-act="evph" data-id="${esc(e.id)}" data-i="${k}" aria-label="Apri la foto ${k+1}"><img src="${im}" alt=""></button>`).join('')}</div>`:'';
    const where=e.gp?`<p class="note" style="margin-top:4px">📍 ${esc(placeName(e.gp))}</p>`:'';
    return `<li class="tli"><i class="tdot ${e.by==='B'?'B':''}"></i><div class="tc"><p class="td">${esc(fmtDate(e.date))}${e.hot?' · hot':''}</p><h3>${esc(e.title)}</h3>${e.text?`<p>${esc(e.text)}</p>`:''}
      ${phs}${where}
      <p class="note"><i class="dot ${e.by==='B'?'B':''}" style="display:inline-block;margin-right:6px"></i>${esc(nm(e.by))}${e.by===me()?` · <button class="link" style="min-height:0;font-size:14px" data-act="evdel" data-id="${esc(e.id)}">Elimina</button>`:''}</p></div></li>`;
  }).join('');
  return `<button class="btn block" data-act="addev">${heartSvg()}Aggiungi un momento</button><ul class="tl">${li}</ul>`;
}
function albumHTML(){
  if(S.mode==='local'&&S.photosOk===false)return `<section class="card empty">${roseSvg()}<p>Su questo browser non posso salvare le foto. Aprila dal Safari o dal Chrome del telefono.</p></section>`;
  const list=S.photos.length
    ?`<div class="pgrid">${S.photos.map(p=>{const s=safeImg(p.th);return s?`<button class="ph" data-act="photo" data-id="${esc(p.id)}" aria-label="Foto di ${esc(nm(p.by))}"><img src="${s}" alt="" loading="lazy"><i class="dot ${p.by==='B'?'B':'A'}"></i></button>`:''}).join('')}</div>`
    :`<section class="card empty">${roseSvg()}<h3>Il vostro album</h3><p class="note">Nessuna foto insieme, per ora. Aggiungete la prima.</p></section>`;
  return `<button class="btn block" data-act="addphoto">${heartSvg()}Aggiungi foto</button>${list}
   <p class="note">${S.mode==='shared'?'Le foto sono visibili a tutti e due. Puoi eliminare solo le tue.':'Le foto restano su questo telefono.'}</p>`;
}
function photoViewHTML(){
  const pv=S.photoView, list=pv.coll==='photos'?S.photos:S.events, p=list.find(x=>x.id===pv.id);
  if(!p){S.photoView=null;return ricordiHTML()}
  const isEv=pv.coll==='events', ths=isEv?evThs(p):[p.th], n=ths.length, idx=Math.max(0,Math.min(pv.i||0,n-1));
  const fid=isEv?evFid(p,idx):p.id, src=safeImg(S.full[fid])||safeImg(ths[idx]), mineP=p.by===me();
  const when=isEv?fmtDate(p.date):new Date(p.at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
  const nav=n>1?`<div class="actions" style="justify-content:center;margin:8px 0"><button class="btn ghost sm" data-act="pnav" data-d="-1" ${idx===0?'disabled':''}>‹</button><span class="note" style="align-self:center">${idx+1} di ${n}</span><button class="btn ghost sm" data-act="pnav" data-d="1" ${idx>=n-1?'disabled':''}>›</button></div>`:'';
  const cap=isEv?`<h3 style="margin-top:8px">${esc(p.title)}</h3>`+(p.text?`<p>${esc(p.text)}</p>`:''):'';
  const place=isEv
    ?`<div class="card" style="margin-top:12px;background:var(--surface2)"><p class="eyebrow">Luogo</p><p style="margin:4px 0 8px">${p.gp?esc(placeName(p.gp)):'Nessun luogo: il momento non è sulla mappa.'}</p>
      <form class="form tform" data-form="place" novalidate>${cityDL()}<input id="f-pl" list="cities" autocomplete="off" placeholder="Scegli una città"><button class="btn sm" type="submit">Imposta</button></form>
      <div class="actions" style="margin-top:8px"><button class="btn ghost sm" data-act="placegeo">Sono qui adesso</button>${p.gp?'<button class="btn ghost sm" data-act="placeclr">Togli il luogo</button>':''}</div></div>`:'';
  const del=isEv&&mineP?`<div class="actions"><button class="btn ghost" data-act="evdel" data-id="${esc(p.id)}">Elimina il momento</button></div>`:'';
  return headerHTML()+`<section class="card pv">${src?`<img src="${src}" alt="Foto di ${esc(nm(p.by))}">`:''}${nav}
   <div class="meta"><i class="dot ${p.by==='B'?'B':''}"></i>${esc(nm(p.by))} · <span class="muted">${esc(when)}</span></div>${cap}${place}${del}
   <div class="actions"><button class="btn ghost" data-act="pclose">Indietro</button></div></section>`;
}
function addevHTML(){
  const on=hotOn(), e=S.ev||{};
  return headerHTML()+`<h2 class="h2">Nuovo momento</h2>
  <form class="card form" data-form="addev" novalidate>${cityDL()}
   <label for="f-et">Titolo</label><input id="f-et" data-d="ev.title" maxlength="60" autocomplete="off" placeholder="Il primo viaggio" value="${esc(e.title||'')}">
   <label for="f-ed">Data</label><input id="f-ed" data-d="ev.date" type="date" max="${todayStr()}" value="${esc(e.date||todayStr())}">
   <label for="f-ex">Racconto (facoltativo)</label><textarea id="f-ex" data-d="ev.text" maxlength="400" placeholder="Cosa ricordi di quel giorno?">${esc(e.text||'')}</textarea>
   <label for="f-ec">Luogo (facoltativo)</label><input id="f-ec" data-d="ev.city" list="cities" autocomplete="off" placeholder="Città, per metterlo sulla mappa" value="${esc(e.city||'')}">
   ${e.gp?`<p class="note">Luogo rilevato dalla foto: ${esc(placeName(e.gp))}. Se scrivi una città qui sopra, vale quella.</p>`:''}
   <label class="chk"><input type="checkbox" data-d="ev.hot" ${e.hot&&on?'checked':''} ${on?'':'disabled'}>Momento hot (visibile solo con il sì di entrambi)</label>
   ${(e.imgs&&e.imgs.length)?`<div class="evimgs">${e.imgs.map((x,k)=>`<span class="evi"><img src="${safeImg(x.th)}" alt="Foto ${k+1}"><button type="button" class="evx" data-act="evrm" data-i="${k}" aria-label="Togli la foto ${k+1}">×</button></span>`).join('')}</div>`:''}
   ${(e.imgs&&e.imgs.length>=3)?'<p class="note">Hai raggiunto il massimo di 3 foto.</p>':`<button class="btn ghost" type="button" data-act="evpick">${(e.imgs&&e.imgs.length)?'Aggiungi un\'altra foto ('+e.imgs.length+'/3)':'Aggiungi foto (fino a 3)'}</button>`}
   <p class="err" id="err" role="alert" hidden></p>
   <button class="btn" type="submit" style="margin-top:8px">Salva nella timeline</button>
  </form>${backBtn('back','Annulla')}`;
}
async function addEvent(o){
  const rec={id:newId(),by:me(),at:Date.now(),date:o.date||todayStr(),title:(o.title||'').slice(0,60),text:(o.text||'').slice(0,400),hot:!!o.hot};
  const imgs=(o.imgs||[]).slice(0,3);
  if(o.gp)rec.gp=o.gp;
  if(imgs.length){rec.ths=imgs.map(x=>x.th); rec.th=imgs[0].th; for(let i=0;i<imgs.length;i++)await putFull(rec.id+'_'+i,imgs[i].img)}
  await putRec('events',rec);
}

/* --- Noi --- */
function noiHTML(){
  if(S.view&&S.view.t==='prof')return profHTML();
  const p=S.profile||{}, nms=p.names||{}, shared=S.mode==='shared', m=me(), o=other(m);
  const a=S.answers[m]||{}, loc=a.loc, ok=!!a.hotok, ook=!!(S.answers[o]||{}).hotok;
  const info=shared&&S.cloudOn
    ?`<p class="note">Siete collegati: quello che aggiunge uno compare sull'altro telefono in pochi secondi.</p>`
    :shared
    ?`<p class="note">Connessi come ${esc(nm(m))}. Per far entrare ${esc(nm(o))} condividi questa pagina dandogli accesso da collaboratore: così anche lui o lei può salvare risposte e foto.</p>`
    :`<p class="note">Modalità telefono condiviso: i dati restano solo su questo dispositivo. Tocca il tuo nome in alto per cambiare chi risponde.</p>`;
  const reset=shared?'':(S.confirmReset
    ?`<div class="card"><p style="margin-bottom:12px">Cancello tutti i dati e le foto su questo telefono? Non si può annullare.</p><div class="actions"><button class="btn" data-act="reset-yes">Sì, cancella</button><button class="btn ghost" data-act="reset-no">Annulla</button></div></div>`
    :`<button class="btn ghost" data-act="reset">Cancella i dati di questo telefono</button>`);
  const hot=`<section class="card"><div class="row"><div><h3 style="font-size:20px">Contenuti hot 18+</h3><p class="note">Domande, quiz, giochi e momenti più maliziosi, sempre senza esagerare. Si attivano solo se acconsentono entrambi.</p></div>
   <button class="sw ${ok?'on':''}" role="switch" aria-checked="${ok}" aria-label="Acconsento ai contenuti hot" data-act="hotok"></button></div>
   <p class="note" style="margin-top:10px">${esc(nm(m))}: ${ok?'acconsente':'non ancora'} · ${esc(nm(o))}: ${ook?'acconsente':'non ancora'} · <b>${hotOn()?'Sbloccati':'Bloccati'}</b></p></section>`;
  const prefs=`<section class="card"><div class="row"><div><h3 style="font-size:20px">Avvisi</h3><p class="note">Ti ricorda la domanda del giorno e ti dice quando l'altro risponde. Funziona finché l'app resta aperta in background.</p></div><button class="sw ${S.notifOn?'on':''}" role="switch" aria-checked="${S.notifOn}" aria-label="Avvisi" data-act="notifon"></button></div>
   <div class="row" style="margin-top:16px"><div><h3 style="font-size:20px">Posizione automatica</h3><p class="note">Aggiorna la tua posizione (approssimata) ogni volta che apri l'app, per calcolare la distanza.</p></div><button class="sw ${S.geoOn?'on':''}" role="switch" aria-checked="${S.geoOn}" aria-label="Posizione automatica" data-act="geoon"></button></div></section>`;
  const cloudCard=S.cloudOn&&cloud?`<section class="card"><h3 style="font-size:20px">Collegamento tra telefoni</h3><p class="note" style="margin-top:6px">Codice coppia</p><div class="bigcode sm">${esc(fmtCode(cloud.code()))}</div>
   <p class="note" style="margin-top:10px">${S.devCode?'Su un nuovo telefono scegli "Ho un codice" e inserisci questo codice monouso (vale 15 minuti): <b>'+esc(fmtCode(S.devCode))+'</b>':'Per usare Cuoricino su un nuovo telefono genera un codice monouso.'}</p>
   ${S.confirmLeave?`<p style="margin-top:12px">Esci da questa coppia su questo telefono? I dati restano sull'altro telefono e nel server.</p><div class="actions"><button class="btn" data-act="leave-yes">Sì, esci</button><button class="btn ghost" data-act="leave-no">Annulla</button></div>`
   :`<div class="actions"><button class="btn sm" data-act="devcode">Collega un nuovo telefono</button><button class="btn ghost sm" data-act="leave">Esci dalla coppia</button></div>`}</section>`:'';
  const t=todayStr(), n=Math.max(0,dnum(t)-dnum(since())), km=distKm(), sN=streak();
  const widgets=`<h3 style="font-size:22px">Widget</h3><p class="note" style="margin-top:-8px">Anteprima di come appariranno sulla Home. I widget veri richiedono la versione nativa per iOS.</p>
   <div class="wgrid">
   <div class="wgt a wide">${heartSvg('wh')}<span class="lb">Insieme da</span><div><div class="big">${n}</div><div class="sm">${n===1?'giorno':'giorni'} · ${esc(nm('A'))} e ${esc(nm('B'))}</div></div></div>
   <div class="wgt k wide"><div style="flex:1"><span class="lb">Distanza</span><div class="big s">${km===null?'—':km.toLocaleString('it-IT')+' km'}</div></div><div style="text-align:right"><span class="lb">Serie</span><div class="big s">${sN}</div></div></div></div>`;
  return headerHTML()+`<h2 class="h2">Noi</h2>
  <form class="card form" data-form="noi" novalidate>
   ${shared?`<div class="duoprof"><div class="pp">${avatarHTML(m,'m')}<b>${esc(nm(m))}</b><span class="note">Tu</span></div><div class="pp">${avatarHTML(o,'m')}<b>${nms[o]?esc(nms[o]):'In attesa…'}</b><span class="note">${nms[o]?'Il suo profilo':'Compare quando si collega'}</span></div></div>
   <label for="f-a">Il tuo nome</label><input id="f-a" maxlength="24" autocomplete="off" value="${esc(nms[m]||'')}">
   <p class="note" style="margin-top:-6px">Il nome e la foto di ${esc(nm(o))} li gestisce lui o lei dal proprio telefono. Qui tu cambi solo i tuoi.</p>`
   :`<label for="f-a">Primo nome</label><input id="f-a" maxlength="24" autocomplete="off" value="${esc(nms.A||'')}">
   <label for="f-b">Secondo nome</label><input id="f-b" maxlength="24" autocomplete="off" value="${esc(nms.B||'')}">`}
   <label for="f-since">Insieme dal</label><input id="f-since" type="date" max="${todayStr()}" value="${esc(p.since||'')}">
   <label for="f-bd">Il tuo compleanno (per le domande speciali)</label><input id="f-bd" type="date" value="${esc(a.bd?'2000-'+a.bd:'')}">
   <datalist id="cities">${CITIES.map(c=>`<option value="${esc(c[0])}"></option>`).join('')}</datalist>
   <p class="note">${loc&&loc.at?'La tua posizione si aggiorna ogni volta che apri l\'app (ultima: '+esc(ago(loc.at))+').':'Posizione non ancora rilevata: consenti l\'accesso alla posizione quando il telefono lo chiede.'} Viene salvata in modo approssimato, mai l'indirizzo.</p>
   <p class="err" id="err" role="alert" hidden></p>
   <button class="btn" type="submit">Salva</button>
   <button class="btn ghost" type="button" data-act="geo" style="margin-top:8px">Aggiorna la posizione adesso</button>
  </form>${hot}${prefs}${cloudCard}${widgets}${info}${reset}`;
}

/* --- Navigazione --- */
const ICONS={
  home:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  quiz:'<path d="M5 5h14v10h-8l-5 4v-4H5z"/>',
  ricordi:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  giochi:'<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r=".8"/><circle cx="18" cy="14" r=".8"/>',
  noi:'<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>'
};
const LABELS={home:'Home',quiz:'Quiz',ricordi:'Ricordi',giochi:'Giochi',noi:'Noi'};
const navHTML=()=>`<div class="in">${Object.keys(ICONS).map(k=>`<button data-tab="${k}" aria-label="${LABELS[k]}" ${S.tab===k?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg></button>`).join('')}</div>`;

const G=window.DUG({S:S,esc:esc,nm:nm,me:me,other:other,heartSvg:heartSvg,toast:toast,rq:rq,render:render,
  hotOn:hotOn,events:()=>S.events.filter(e=>!e.hot||hotOn()),dnum:dnum,todayStr:todayStr,safeImg:safeImg,
  setActive:m=>{if(S.mode==='local'){S.active=m;lsSave()}rq()},
  saveGame:g=>{S.game=g;if(S.mode==='shared')db.doc('games/cur').set(g).catch(()=>toast('Non riesco a salvare la mossa.'));else lsSave();rq()},
  clearGame:()=>{S.game=null;if(S.mode==='shared')db.doc('games/cur').delete().catch(()=>{});else lsSave();rq()},
  mergeGame:fn=>{
    if(S.mode==='shared'){
      db.doc('games/cur').get().then(s=>{const cur=s.exists?s.data():S.game;const n=fn(cur?JSON.parse(JSON.stringify(cur)):null);if(n){S.game=n;return db.doc('games/cur').set(n)}}).then(()=>rq()).catch(()=>toast('Non riesco a salvare il risultato.'));
    }else{const n=fn(S.game?JSON.parse(JSON.stringify(S.game)):null);if(n){S.game=n;lsSave()}rq()}
  },
  addScore:(w,t)=>{const sc=Object.assign({A:0,B:0,D:0},S.scores);sc.g=JSON.parse(JSON.stringify(sc.g||{}));sc[w]=(sc[w]||0)+1;if(t){const x=sc.g[t]=Object.assign({A:0,B:0,D:0},sc.g[t]);x[w]++}S.scores=sc;if(S.mode==='shared')db.doc('couple/scores').set(S.scores).catch(()=>{});else lsSave()},
  resetScores:t=>{const sc=Object.assign({A:0,B:0,D:0},S.scores);sc.g=JSON.parse(JSON.stringify(sc.g||{}));
    if(!t){sc.A=sc.B=sc.D=0;sc.g={}}else{const x=Object.assign({A:0,B:0,D:0},sc.g[t]);['A','B','D'].forEach(k=>{sc[k]=Math.max(0,(sc[k]||0)-x[k])});delete sc.g[t]}
    S.scores=sc;if(S.mode==='shared')db.doc('couple/scores').set(S.scores).catch(()=>{});else lsSave();rq()},
  addEvent:o=>addEvent(o).then(()=>rq()).catch(()=>toast('Non riesco a salvare nella timeline.'))});

function html(){
  if(S.mode==='boot')return loadingHTML();
  if(S.mode==='welcome')return welcomeHTML();
  if(S.err)return errorHTML();
  if(S.mode==='shared'&&!S.loadedP)return loadingHTML();
  if(!S.profile)return setupHTML();
  if(S.mode==='shared'&&!S.slot)return chooserHTML();
  if(S.mode==='shared'&&S.slot&&S.canWrite&&!((S.profile.names||{})[S.slot]))return nameHTML();
  if(S.tab==='quiz')return quizHTML();
  if(S.tab==='ricordi')return ricordiHTML();
  if(S.tab==='giochi')return headerHTML()+G.render();
  if(S.tab==='noi')return noiHTML();
  return homeHTML();
}
function render(force){
  if(S.freeze&&!force)return;
  const ae=document.activeElement;
  if(!force&&ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&$app.contains(ae)){S.dirty=true;return}
  S.dirty=false;
  let h; try{h=html()}catch(e){h='<div class="center"><p class="lead">Qualcosa non va nel disegnare questa schermata. Tocca Home e riprova.</p></div>';try{console.error(e)}catch(x){}}
  $app.innerHTML=h;
  const main=S.profile&&S.mode!=='boot'&&!S.err&&!(S.mode==='shared'&&(!S.loadedP||!S.slot));
  $nav.innerHTML=main?navHTML():''; $nav.hidden=!main;
  if(S.play&&S.tab==='giochi')G.mount();
  if(S.tab==='ricordi'&&S.rtab==='map')mapMount();
}
document.addEventListener('focusout',()=>setTimeout(()=>{if(S.dirty&&!S.freeze)render()},60));
document.addEventListener('input',e=>{
  const t=e.target, d=t&&t.dataset&&t.dataset.d; if(!d)return;
  const v=t.type==='checkbox'?t.checked:t.value;
  const p=d.split('.');
  if(p.length===1)S[p[0]]=v; else{S[p[0]]=S[p[0]]||{};S[p[0]][p[1]]=v}
});
document.addEventListener('change',e=>{
  const t=e.target; if(t&&t.dataset&&t.dataset.sel==='deckcat'){S.deckCat=t.value;if(isHot(S.deckCat)&&!hotOn()){S.deckCat='all';toast('Servono il sì di tutti e due, nella sezione Noi.')}render(true);return}
  if(t&&t.type==='checkbox'&&t.dataset&&t.dataset.d){const p=t.dataset.d.split('.');S[p[0]]=S[p[0]]||{};S[p[0]][p[1]]=t.checked}
});

/* ---------- Azioni ---------- */
function openRun(src){
  const items=srcOf(src).items; if(!items.length)return;
  const m=me(), i=items.findIndex(it=>!done(ans(m,it.key)));
  S.view=i<0?{t:'res',src:src}:{t:'run',src:src,i:i}; S.tab='quiz'; go();
}
function advance(){
  const v=S.view, items=srcOf(v.src).items;
  if(v.i<items.length-1)v.i++; else S.view={t:'res',src:v.src};
  go();
}
function passPhone(){
  S.active=other(S.active); lsSave();
  const v=S.view;
  if(v&&v.t==='run'){const items=srcOf(v.src).items,i=items.findIndex(it=>!done(ans(S.active,it.key)));S.view=i<0?{t:'res',src:v.src}:{t:'run',src:v.src,i:i}}
  go();
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-tab],[data-act]'); if(!t||t.disabled)return;
  if(t.dataset.tab){
    S.tab=t.dataset.tab; S.view=null; S.photoView=null; S.confirmReset=false; S.confirmDel=false;
    if(S.tab!=='giochi'&&S.play){S.play=null;S.freeze=false}
    go(); return;
  }
  const act=t.dataset.act, i=t.dataset.i!==undefined?+t.dataset.i:null;
  if(act&&act.indexOf('g-')===0){if(G.click(act,t)){rq()}return}
  switch(act){
  case 'switch': S.active=other(S.active);lsSave();S.view=null;S.photoView=null;go();break;
  case 'pass': passPhone();break;
  case 'pick': if(saveAns(t.dataset.key,i))render(true);break;
  case 'daily':{
    const k=t.dataset.k, m=me(), today=todayStr();
    if(t.dataset.hint==='hot'){toast('Servono il sì di tutti e due, nella sezione Noi.');S.tab='noi';go();break}
    if(t.dataset.hint==='prev'){
      const need=k==='w'?dailyItem('d',today):dailyItem('w',today);
      if(k==='w'?!dayDone(m,today):!done(ans(m,need.key))){toast('Prima rispondi alla carta precedente.');break}
    }
    S.view={t:'daily',k:k};go();break}
  case 'prof': S.st='';S.nt=((S.answers[me()]||{}).note||{}).t||'';S.view={t:'prof'};go();break;
  case 'dist': S.tab='noi';S.view=null;go();break;
  case 'stog':{const sl=[me(),other(me())].find(x=>activeStories(x).length);
    if(sl){S.view={t:'story',s:sl,i:0};go()}else{S.st='';S.nt=((S.answers[me()]||{}).note||{}).t||'';S.view={t:'prof'};go()}break}
  case 'story':{
    const s=t.dataset.s;
    if(!activeStories(s).length){toast(nm(s)+' non ha storie attive. Si pubblicano dal profilo.');break}
    S.view={t:'story',s:s,i:0};if(S.tab!=='ricordi'&&S.tab!=='home')S.tab='home';go();break}
  case 'snext': S.view.i=(S.view.i||0)+1; if(S.view.i>=activeStories(S.view.s).length)S.view.i=activeStories(S.view.s).length-1; go();break;
  case 'sprev': S.view.i=Math.max(0,(S.view.i||0)-1);go();break;
  case 'sdel': delRec('stories',t.dataset.id).then(()=>{toast('Storia eliminata');go()}).catch(()=>toast('Non riesco a eliminarla.'));break;
  case 'storypick': pickFile('story',false);break;
  case 'addstory': if(!S.canWrite){toast(RO);break} pickFile('story',false);break;
  case 'avpick': pickFile('avatar',false);break;
  case 'setst':{const p=D.STATUS.concat(hotOn()?D.STATUS_HOT:[])[i];if(p&&saveMine({st:{t:p,at:Date.now()}})){toast('Stato aggiornato');S.view=null;go()}break}
  case 'clrst': if(saveMine({st:null})){toast('Stato tolto');go()}break;
  case 'draw':{
    if(!S.canWrite){toast(RO);break}
    const dc=(isHot(S.deckCat)&&!hotOn())?'all':(S.deckCat||'all'), n=drawNext(dc); if(n===null){toast('Nessuna domanda in questa categoria.');break} S.draw=n;
    if(S.mode==='shared')db.doc('couple/draw').set({i:n,at:Date.now()}).catch(()=>toast('Non riesco a pescare.')); else lsSave();
    render(true);break}
  case 'pcat': S.pcat=t.dataset.c;render(true);break;
  case 'deckcat': S.deckCat=t.dataset.c; if(isHot(S.deckCat)&&!hotOn()){S.deckCat='all';toast('Servono il sì di tutti e due, nella sezione Noi.')} render(true);break;
  case 'quickn': S.quickN=+t.dataset.n;render(true);break;
  case 'quickhot': S.quickHot=!S.quickHot;render(true);break;
  case 'quicknew':{
    if(!S.canWrite){toast(RO);break}
    const cat=S.quickHot&&hotOn()?'hot':((S.deckCat&&!isHot(S.deckCat))?S.deckCat:'all'), pool=allowedDeck(cat), m=me();
    const fresh=shuffle(pool.filter(x=>!done(ans(m,'k'+x)))), rest=shuffle(pool.filter(x=>done(ans(m,'k'+x))));
    const ids=fresh.concat(rest).slice(0,S.quickN);
    S.quick={ids:ids,at:Date.now()};
    if(S.mode==='shared')db.doc('couple/quick').set(S.quick).catch(()=>toast('Non riesco a creare il quiz.')); else lsSave();
    openRun('quick');break}
  case 'open': openRun(t.dataset.src);break;
  case 'res': S.view={t:'res',src:t.dataset.src};S.tab='quiz';go();break;
  case 'ans':{
    const it=srcOf(S.view.src).items[S.view.i];
    if(saveAns(it.key,i))advance();break}
  case 'prev': S.view.i=Math.max(0,S.view.i-1);go();break;
  case 'back': S.view=null;S.photoView=null;go();break;
  case 'addq': S.cq={t:'',o:'',hot:false,cat:'know'};S.view={t:'addq'};S.tab='quiz';go();break;
  case 'delq': delRec('custom',t.dataset.id).then(()=>render(true)).catch(()=>toast('Non riesco a eliminarla.'));break;
  case 'w-create':
    S.welcome={step:'choose'}; cloud.create().then(c=>{S.welcome={step:'created',code:c.code};render(true)}).catch(e=>{S.welcome={step:'choose',err:'Non riesco a creare la coppia: '+(e&&e.message||'errore')};render(true)});break;
  case 'w-have': S.welcome={step:'code'};render(true);break;
  case 'w-back': S.welcome={step:'choose'};render(true);break;
  case 'w-go': startCloud();break;
  case 'w-retry': startCloud();break;
  case 'w-local': startLocal();break;
  case 'w-share':{
    const txt='Entra in Cuoricino con il nostro codice: '+fmtCode(S.welcome&&S.welcome.code);
    if(navigator.share)navigator.share({text:txt}).catch(()=>{}); else if(navigator.clipboard)navigator.clipboard.writeText(txt).then(()=>toast('Codice copiato')).catch(()=>toast(txt)); else toast(txt);
    break}
  case 'devcode': cloud.deviceCode().then(c=>{S.devCode=c;render(true)}).catch(e=>toast('Non riesco a creare il codice: '+(e&&e.message||'errore')));break;
  case 'leave': S.confirmLeave=true;render(true);break;
  case 'leave-no': S.confirmLeave=false;render(true);break;
  case 'leave-yes': cloud.leave(); try{location.reload()}catch(x){} break;
  case 'notifon':{
    if(S.notifOn){S.notifOn=false;lset('sint-notif','0');render(true);break}
    if(typeof Notification==='undefined'){toast('Gli avvisi non sono supportati qui. Su iPhone aggiungi prima l\'app alla schermata Home.');break}
    Notification.requestPermission().then(r=>{if(r==='granted'){S.notifOn=true;lset('sint-notif','1');toast('Avvisi attivi')}else toast('Il telefono ha negato il permesso agli avvisi.');render(true)}).catch(()=>toast('Avvisi non disponibili qui.'));break}
  case 'geoon':{
    if(S.geoOn){S.geoOn=false;lset('sint-geo','0');render(true);break}
    S.geoOn=true;lset('sint-geo','1');geoUpdate(true);render(true);break}
  case 'rtab': S.rtab=t.dataset.v;render(true);break;
  case 'mapz': mapZoom(+t.dataset.d);break;
  case 'mappin': if(mapDrag)break; S.tab='ricordi'; openFull('events',t.dataset.id,0);break;
  case 'placeclr':{const p=curItem();if(p){delete p.gp;putRec(S.photoView.coll,p).then(()=>{toast('Luogo tolto');render(true)}).catch(()=>toast('Non riesco a salvare.'))}break}
  case 'placegeo':{
    const p=curItem(); if(!p)break;
    if(!navigator.geolocation){toast('Posizione non disponibile qui: scegli la città.');break}
    try{navigator.geolocation.getCurrentPosition(pos=>{p.gp={la:Math.round(pos.coords.latitude*1e4)/1e4,lo:Math.round(pos.coords.longitude*1e4)/1e4};putRec(S.photoView.coll,p).then(()=>{toast('Luogo impostato');render(true)}).catch(()=>toast('Non riesco a salvare.'))},()=>toast('Posizione non disponibile qui: scegli la città.'),{timeout:8000})}catch(x){toast('Posizione non disponibile qui: scegli la città.')}
    break}
  case 'addev': S.ev={date:todayStr()};S.view={t:'addev'};go();break;
  case 'evpick': pickFile('event',true);break;
  case 'evdel':{const ev=S.events.find(x=>x.id===t.dataset.id);
    delRec('events',t.dataset.id).then(async()=>{if(ev){const n=Math.max(1,evThs(ev).length);for(let i=0;i<n;i++)await delFull(evFid(ev,i))}S.photoView=null;go()}).catch(()=>toast('Non riesco a eliminarlo.'));break}
  case 'evrm': if(S.ev&&S.ev.imgs){S.ev.imgs.splice(i,1);if(!S.ev.imgs.length)delete S.ev.gp;render(true)}break;
  case 'pnav': if(S.photoView){S.photoView.i=(S.photoView.i||0)+(+t.dataset.d);const p=S.events.find(x=>x.id===S.photoView.id);if(p)S.photoView.i=Math.max(0,Math.min(S.photoView.i,evThs(p).length-1));openFull(S.photoView.coll,S.photoView.id,S.photoView.i)}break;
  case 'evph': openFull('events',t.dataset.id,i||0);break;
  case 'addphoto': pickFile('album',true);break;
  case 'photo': openFull('photos',t.dataset.id);break;
  case 'pclose': S.photoView=null;S.confirmDel=false;go();break;
  case 'pdel': S.confirmDel=true;render(true);break;
  case 'pdel-no': S.confirmDel=false;render(true);break;
  case 'pdel-yes':{
    const id=S.photoView&&S.photoView.id; if(!id)break;
    delRec('photos',id).then(()=>delFull(id)).then(()=>{delete S.full[id];S.photoView=null;S.confirmDel=false;toast('Foto eliminata');go()}).catch(()=>toast('Non riesco a eliminarla.'));break}
  case 'slot':{
    claimSlot(t.dataset.s,!!t.dataset.o); go();break}
  case 'hotok':{
    const on=!(S.answers[me()]||{}).hotok;
    if(saveMine({hotok:on}))toast(on?'Hai acconsentito. Si sblocca quando acconsente anche l\'altro.':'Contenuti hot disattivati');
    if(!on&&isHot(S.deckCat))S.deckCat='all';
    render(true);break}
  case 'geo':{
    if(!navigator.geolocation){toast('Posizione non disponibile qui: scegli la città.');break}
    try{navigator.geolocation.getCurrentPosition(pos=>{
      if(saveMine({loc:{n:'Posizione attuale',la:Math.round(pos.coords.latitude*10)/10,lo:Math.round(pos.coords.longitude*10)/10}})){toast('Posizione salvata (approssimata)');render(true)}
    },()=>toast('Posizione non disponibile qui: scegli la città.'),{timeout:8000})}catch(x){toast('Posizione non disponibile qui: scegli la città.')}
    break}
  case 'reset': S.confirmReset=true;render(true);break;
  case 'reset-no': S.confirmReset=false;render(true);break;
  case 'reset-yes':{
    if(idb){['docs','full','photos'].forEach(st=>idbAll(st).then(l=>l.forEach(r=>idbDel(st,r.k||r.id))).catch(()=>{}))}
    S.profile=null;S.answers={A:{},B:{}};S.active='A';S.draw=null;S.quick=null;S.game=null;S.scores={A:0,B:0};
    S.photos=[];S.events=[];S.stories=[];S.custom=[];S.chat=[];S.full={};S.confirmReset=false;S.tab='home';S.view=null;S.photoView=null;
    try{localStorage.removeItem(LS)}catch(x){} mem.v=null; go();break}
  }
});
const curItem=()=>{const pv=S.photoView;return pv?(pv.coll==='photos'?S.photos:S.events).find(x=>x.id===pv.id):null};
async function openFull(coll,id,i){
  i=i||0; S.photoView={coll:coll,id:id,i:i}; S.confirmDel=false; go();
  const it=curItem(); const fid=(coll==='events'&&it)?evFid(it,i):id;
  if(S.full[fid])return;
  try{const img=await getFull(fid); if(img){S.full[fid]=img;render(true)}}catch(e){}
}

document.addEventListener('submit',e=>{
  const f=e.target.closest('form[data-form]'); if(!f)return; e.preventDefault();
  const kind=f.dataset.form, blur=()=>{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()};
  const g=id=>{const el=document.getElementById(id);return el?(el.value||'').trim():''};
  const err=document.getElementById('err'), fail=m=>{if(err){err.textContent=m;err.hidden=false}};
  if(kind==='join'){
    const code=g('f-code'); if(!code)return fail('Scrivi il codice.');
    blur(); cloud.join(code).then(()=>startCloud()).catch(e=>fail(e&&e.message||'Codice non valido.')); return;
  }
  if(kind==='tans'){
    const inp=f.querySelector('input'), v=((inp&&inp.value)||'').trim().slice(0,160); if(!v)return;
    blur(); if(saveAns(f.dataset.key,v)){if(f.dataset.run&&S.view&&S.view.t==='run')advance(); else render(true)}
    return;
  }
  if(kind==='chat'){
    const inp=f.querySelector('input'), v=((inp&&inp.value)||'').trim().slice(0,300); if(!v)return;
    if(!S.canWrite)return toast(RO);
    const th=f.dataset.th; blur(); if(inp)inp.value='';
    putRec('chat',{id:newId(),th:th,by:me(),at:Date.now(),t:v}).catch(()=>toast('Non riesco a inviare il messaggio.'));
    render(true); return;
  }
  if(kind==='cap'){
    const cap=g('f-cap').slice(0,80), p=S.photos.find(x=>x.id===(S.photoView&&S.photoView.id)); if(!p)return;
    blur(); p.cap=cap;
    putRec('photos',p).catch(()=>toast('Non riesco a salvare la dedica.')); toast('Dedica salvata'); render(true); return;
  }
  if(kind==='place'){
    const city=g('f-pl'), c=CITIES.find(x=>x[0].toLowerCase()===city.toLowerCase()), p=curItem();
    if(!p)return; if(!c){toast('Non conosco questa città: scegline una dalla lista.');return}
    blur(); p.gp={la:c[1],lo:c[2]}; putRec(S.photoView.coll,p).then(()=>{toast('Luogo impostato');render(true)}).catch(()=>toast('Non riesco a salvare.')); return;
  }
  if(kind==='status'){
    const v=g('f-st').slice(0,40); if(!v)return; blur();
    if(saveMine({st:{t:v,at:Date.now()}})){S.st='';toast('Stato aggiornato');S.view=null;go()} return;
  }
  if(kind==='note'){
    const v=g('f-nt').slice(0,200); blur();
    if(saveMine({note:v?{t:v,at:Date.now()}:null})){toast(v?'Nota salvata':'Nota rimossa');S.view=null;go()} return;
  }
  if(kind==='addq'){
    const q=S.cq||{}, t=(q.t||'').trim(), lines=String(q.o||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,6);
    if(!t)return fail('Scrivi la domanda.');
    if(lines.length===1)return fail('Servono almeno 2 opzioni, oppure nessuna per la risposta libera.');
    if(!S.canWrite)return toast(RO);
    blur();
    putRec('custom',{id:newId(),by:me(),at:Date.now(),t:t.slice(0,140),o:lines,hot:!!(q.hot&&hotOn()),cat:q.cat||'know'}).then(()=>{S.cq=null;S.view=null;toast('Domanda aggiunta');go()}).catch(()=>toast('Non riesco a salvarla.'));
    return;
  }
  if(kind==='addev'){
    const ev=S.ev||{}, t=(ev.title||'').trim();
    if(!t)return fail('Dai un titolo al momento.');
    if(!ev.date)return fail('Scegli la data.');
    if(ev.date>todayStr())return fail('La data non può essere nel futuro.');
    if(!S.canWrite)return toast(RO);
    blur();
    addEvent({title:t,date:ev.date,text:(ev.text||'').trim(),hot:ev.hot&&hotOn(),imgs:ev.imgs,gp:(()=>{const c=CITIES.find(x=>x[0].toLowerCase()===String(ev.city||'').trim().toLowerCase());return c?{la:c[1],lo:c[2]}:(ev.gp||null)})()}).then(()=>{S.ev=null;S.view=null;S.tab='ricordi';S.rtab='time';toast('Aggiunto alla timeline');go()}).catch(()=>toast('Non riesco a salvarlo.'));
    return;
  }
  if(kind==='myname'){
    const a=g('f-a'); if(!a)return fail('Scrivi il tuo nome.');
    const on=((S.profile.names||{})[other(me())]||'');
    if(on&&a.toLowerCase()===on.toLowerCase())return fail('I due nomi devono essere diversi.');
    blur(); const bdv=g('f-bd'); if(bdv)saveMine({bd:bdv.slice(5)});
    const names=Object.assign({},S.profile.names,{[me()]:a}); S.profile=Object.assign({},S.profile,{names:names});
    db.doc('couple/profile').update({names:names}).catch(()=>toast('Non riesco a salvare. Riprova.'));
    go(); return;
  }
  const shr=S.mode==='shared';
  const a=g('f-a'), b=shr?(kind==='setup'?'':((S.profile&&S.profile.names||{})[other(me())]||'')):g('f-b'), sn=g('f-since');
  if(!a||(!b&&!shr))return fail(shr?'Scrivi il tuo nome.':'Scrivi entrambi i nomi.');
  if(shr&&kind!=='setup'&&b&&a.toLowerCase()===b.toLowerCase())return fail('I due nomi devono essere diversi.');
  if(!shr&&a.toLowerCase()===b.toLowerCase())return fail('I due nomi devono essere diversi.');
  if(!sn)return fail('Scegli da quando state insieme.');
  if(sn>todayStr())return fail('La data di inizio non può essere nel futuro.');
  blur();
  if(kind==='setup'){
    const p={names:shr?{A:a}:{A:a,B:b},since:sn};
    if(S.mode==='shared'){S.profile=p;claimSlot('A',false);db.doc('couple/profile').set(p).catch(()=>toast('Non riesco a creare la coppia. Riprova.'))}
    else{S.profile=p;lsSave()}
    S.tab='home';go();
  }else{
    const bdv=g('f-bd'); saveMine({bd:bdv?bdv.slice(5):null});
    const nn=shr?Object.assign({},S.profile.names,{[me()]:a}):{A:a,B:b};
    S.profile=Object.assign({},S.profile,{names:nn,since:sn});
    if(S.mode==='shared')db.doc('couple/profile').update({names:nn,since:sn}).catch(()=>toast('Non riesco a salvare. Riprova.'));
    else lsSave();
    toast('Salvato');go();
  }
});

/* ---------- Avvio ---------- */
async function startLocal(){
  let v=lsLoad();
  if(!v){try{const o=JSON.parse(localStorage.getItem('duetto-v2'));if(o&&o.profile)v={profile:o.profile,answers:{A:{},B:{}},active:o.active||'A'}}catch(e){}}
  if(v){
    S.profile=v.profile||null;S.answers=v.answers||{A:{},B:{}};S.active=v.active||'A';
    S.draw=validDraw(v.draw);S.quick=v.quick||null;S.game=v.game||null;S.scores=v.scores||{A:0,B:0};
  }
  S.mode='local'; S.photosOk=null; render();
  try{
    idb=await idbOpen();
    const legacy=await idbAll('photos');
    for(const r of legacy){
      if(r.img){await idbPut('full',{id:r.id,img:r.img})}
      await idbPut('docs',{k:'photos/'+r.id,d:{by:r.by,at:r.at,cap:r.cap||'',th:r.th}});
      await idbDel('photos',r.id);
    }
    (await idbAll('docs')).forEach(r=>{
      const p=r.k.split('/'), c=p[0], id=p.slice(1).join('/');
      if(S[c]&&Array.isArray(S[c]))S[c].push(Object.assign({id:id},r.d));
    });
    ['photos','events','stories','custom','chat'].forEach(sortL);
    S.photosOk=true;
  }catch(e){S.photosOk=false}
  render();
}
async function startShared(dbm,um,id,viaCloud){
  db=dbm; S.mode='shared'; S.cloudOn=!!viaCloud; S.uid=id; S.photosOk=true;
  try{const cw=await um.can('data.write');S.canWrite=cw!==false}catch(x){}
  const slow=setTimeout(()=>{if(!S.loadedP){S.slow=true;render()}},10000);
  setTimeout(()=>{S.watchOk=true},5000);
  db.doc('couple/profile').onSnapshot(snap=>{
    S.loadedP=true;clearTimeout(slow);S.slow=false;
    S.profile=snap.exists?snap.data():null;
    computeSlot(); autoClaim(); rq();
  },e=>{S.err=e&&e.code||'error';rq()});
  db.collection('slots').orderBy('at','desc').limit(10).onSnapshot(snap=>{
    const mine=S.slots[S.uid]; S.slots={}; snap.docs.forEach(d=>{S.slots[d.id]=d.data().s});
    if(mine&&!S.slots[S.uid])S.slots[S.uid]=mine;
    S.loadedS=true; computeSlot(); autoClaim(); geoUpdate(); rq();
  },()=>{});
  ['A','B'].forEach(k=>db.doc('answers/'+k).onSnapshot(snap=>{
    const before=S.answers[k]||{}; S.answers[k]=snap.exists?snap.data():{};
    watchPartner(k,before); rq();
  },()=>{}));
  db.doc('couple/draw').onSnapshot(snap=>{const d=snap.exists?snap.data():null;S.draw=d?validDraw(d.i):null;rq()},()=>{});
  db.doc('couple/quick').onSnapshot(snap=>{S.quick=snap.exists?snap.data():null;rq()},()=>{});
  db.doc('couple/scores').onSnapshot(snap=>{S.scores=snap.exists?Object.assign({A:0,B:0},snap.data()):{A:0,B:0};rq()},()=>{});
  db.doc('games/cur').onSnapshot(snap=>{S.game=snap.exists?snap.data():null;rq()},()=>{});
  [['photos',60],['events',200],['stories',40],['custom',100],['chat',600]].forEach(x=>{
    db.collection(x[0]).orderBy('at','desc').limit(x[1]).onSnapshot(snap=>{
      const old=x[0]==='chat'?S.chat:null;
      S[x[0]]=snap.docs.map(d=>Object.assign({id:d.id},d.data())); sortL(x[0]);
      if(x[0]==='photos'&&S.photoView&&S.photoView.coll==='photos'&&!S.photos.some(p=>p.id===S.photoView.id))S.photoView=null;
      if(x[0]==='stories'&&S.slot){S.stories.filter(s=>s.by===S.slot&&Date.now()-s.at>=864e5*3).forEach(s=>{db.doc('stories/'+s.id).delete().catch(()=>{})})}
      if(x[0]==='chat')chatNotify(old);
      rq();
    },()=>{});
  });
  render();
}
async function boot(){
  render();
  const C=window.claude;
  if(C&&typeof C.use==='function'){
    let dbm=null,um=null,id=null;
    try{const r=await Promise.all([C.use('db'),C.use('user')]);dbm=r[0];um=r[1]}catch(x){}
    try{id=um?await um.id():null}catch(x){}
    if(dbm&&id){startShared(dbm,um,id);return}
  }
  const cfg=window.SINTONIA_CFG;
  if(cfg&&cfg.url&&cfg.key&&window.DUCloud){
    cloud=window.DUCloud(cfg);
    if(cloud.hasCouple()){startCloud();return}
    const v=lsLoad(); if(v&&v.profile){startLocal();return}
    S.mode='welcome';S.welcome={step:'choose'};render();return;
  }
  startLocal();
}
boot();
})();
