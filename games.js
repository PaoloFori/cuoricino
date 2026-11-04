/* Cuoricino: giochi di coppia. Ricevono le funzioni dell'app (DU) e restituiscono render/click/mount. */
(function(){
'use strict';
window.DUG=function(DU){
const S=DU.S, esc=DU.esc, nm=DU.nm, me=DU.me, other=DU.other, hs=DU.heartSvg, D=window.DUC;
const rnd=n=>Math.floor(Math.random()*n), rndG=rnd;
const pick=a=>a[rnd(a.length)];
const clone=o=>JSON.parse(JSON.stringify(o));
const GAMES=[
 {id:'q20',t:'20 domande',b:'Uno pensa a qualcosa, l\'altro ha solo domande sì/no per indovinare.',hidden:true,ico:'❓',gr:'#7b61ff,#c04cfd'},
 {id:'c4',t:'Forza 4',b:'Dischi che cadono, righe da quattro. Griglia grande e Pop out.',hidden:false,ico:'🔴',gr:'#5b4bd6,#3b2fa8'},
 {id:'bs',t:'Battaglia navale',b:'Piazza la flotta, prendi la mira e fuoco. Più flotte e regole.',hidden:true,ico:'🚢',gr:'#4aa8e8,#1f6fb8'},
 {id:'ic',t:'Indovina chi',b:'Scopri la carta segreta con le domande giuste.',hidden:true,ico:'🕵️',gr:'#ff9a8b,#ff6a88'},
 {id:'arch',t:'Tiro con l\'arco',b:'Tendi l\'arco, tieni conto del vento e colpisci il centro.',hidden:false,ico:'🏹',gr:'#ee0979,#ff6a00'},
 {id:'tris',t:'Tris',b:'Il classico tre in fila, anche in versione grande 5×5.',hidden:false,ico:'⭕',gr:'#11998e,#38ef7d'},
 {id:'mem',t:'Memory a coppie',b:'Gira le carte e trova le coppie: ogni coppia ti dà un altro turno.',hidden:false,ico:'🃏',gr:'#f7971e,#ffd200'},
 {id:'golf',t:'Mini golf',b:'Campi casuali, ostacoli e bumper. Lo stesso percorso per tutti e due.',hidden:false,ico:'⛳',gr:'#56ab2f,#a8e063'},
 {id:'flap',t:'Flappy cuore',b:'Tocca per battere le ali e passa tra i tubi senza toccarli. Stessi tubi per tutti e due: vince chi ne supera di più.',hidden:false,ico:'🐦',gr:'#4facfe,#00c6fb'},
 {id:'dash',t:'Cuore Dash',b:'Il cuore corre da solo: tocca per saltare spine, blocchi e buche. Stesso percorso per tutti e due: vince chi va più lontano.',hidden:false,ico:'🔷',gr:'#7b61ff,#e0457a'}];
const TN={rom:'Romantico',hot:'Hot',ric:'I nostri ricordi'};
const ginfo=id=>GAMES.find(x=>x.id===id);
const actorOK=g=>S.mode==='local'||g.turn===me();
/* La partita aspetta me? (serve all'elenco partite e alle notifiche) */
function myTurn(g,m){
  if(!g||g.w)return false;
  if(g.type==='arch'||g.type==='golf'||g.type==='flap'||g.type==='dash')return !!g.s&&g.s[m]===null;
  if(g.type==='bs'&&g.phase==='place')return !(g.ready&&g.ready[m]);
  if(g.type==='ic'&&g.phase==='pick')return !g.pick||g.pick[m]===null||g.pick[m]===undefined;
  return g.turn===m;
}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const randCfg=(id,r)=>{const c={};(OPTS[id]||[]).forEach(o=>{c[o.k]=o.v[Math.floor((r||Math.random)()*o.v.length)][0]});return c};
const cfgText=(id,cfg)=>(OPTS[id]||[]).map(o=>{const v=o.v.find(x=>x[0]===(cfg||{})[o.k]);return v?o.t+': '+v[1]:''}).filter(Boolean).join(' · ');
/* Sfida del giorno: due giochi con regole a caso, uguali per tutti e due (dipendono solo dalla data) */
const DAILY_POOL=[['c4','tris','mem'],['arch','golf']];
function dailyChallenges(date){
  const r=mulberry(DU.dnum(date)*7919+13);
  return DAILY_POOL.map(pool=>{const id=pool[Math.floor(r()*pool.length)];return {id:id,cfg:randCfg(id,r),gid:'sd'+date.replace(/-/g,'')+id,date:date}});
}
function startDaily(date,id){
  const c=dailyChallenges(date).find(x=>x.id===id); if(!c)return;
  if(DU.games()[c.gid]){DU.openGame(c.gid);return}
  const r=mulberry(DU.dnum(date)*31+id.length*7);
  startGame(id,'rom',c.cfg,{id:c.gid,rnd:n=>Math.floor(r()*n),at:DU.dnum(date)*864e5+43200000});
}

/* ---------- Impostazioni di ogni gioco ---------- */
const OPTS={
 c4:[
  {k:'size',t:'Livello · griglia',v:[['7x6','Facile · classica 7×6'],['9x7','Difficile · grande 9×7'],['11x9','Esperto · gigante 11×9']],d:0},
  {k:'pop',t:'Pop out',v:[[0,'No'],[1,'Sì']],d:0,h:'Con Pop out puoi togliere un tuo disco dalla riga in basso: quelli sopra scendono.'}],
 bs:[
  {k:'fleet',t:'Flotta',v:[['s','Rapida · 6×6, 3 navi'],['m','Media · 8×8, 5 navi'],['l','Classica · 10×10, 5 navi']],d:1},
  {k:'bonus',t:'Colpo bonus',v:[[1,'Sì: se colpisci, rigiochi'],[0,'No: si alterna sempre']],d:0},
  {k:'touch',t:'Navi vicine',v:[[1,'Possono toccarsi'],[0,'Devono stare distanti']],d:0}],
 arch:[
  {k:'diff',t:'Livello',v:[[1,'Facile'],[2,'Normale'],[3,'Difficile: raffiche e bersaglio piccolo'],[4,'Esperto: tremolio, vento e bersaglio minuscolo']],d:1,h:'Ogni freccia il bersaglio si allontana: più piccolo, più veloce, vento più forte.'},
  {k:'n',t:'Frecce a testa',v:[[3,'3'],[5,'5'],[10,'10']],d:1},
  {k:'wind',t:'Vento',v:[[0,'Assente'],[1,'Leggero'],[2,'Forte']],d:1},
  {k:'mov',t:'Bersaglio',v:[[0,'Fermo'],[1,'Mobile']],d:0}],
 q20:[
  {k:'n',t:'Quante domande',v:[[10,'10'],[20,'20 (classico)'],[30,'30']],d:1},
  {k:'cat',t:'Cosa si deve indovinare',v:[['any','Qualsiasi cosa'],['animale','Un animale'],['oggetto','Un oggetto'],['persona','Una persona'],['luogo','Un luogo'],['cibo','Un cibo']],d:0,h:'Chi pensa sceglie un segreto di questo tipo e lo scrive: l\'altro lo vede solo alla fine.'}],
 tris:[
  {k:'sz',t:'Livello · griglia',v:[[3,'Facile · 3×3, tre in fila'],[5,'Difficile · 5×5, quattro in fila'],[7,'Esperto · 7×7, cinque in fila']],d:0}],
 mem:[
  {k:'pairs',t:'Livello · coppie',v:[[6,'Facile · 6 coppie'],[8,'Normale · 8'],[10,'Difficile · 10'],[12,'Esperto · 12']],d:1},
  {k:'mix',t:'Rimescolare',v:[[0,'No'],[1,'Sì: dopo ogni errore le carte rimaste cambiano posto']],d:0}],
 flap:[
  {k:'diff',t:'Livello',v:[[1,'Facile: varco largo'],[2,'Normale'],[3,'Difficile: varco stretto'],[4,'Esperto: stretto e veloce']],d:1},
  {k:'tries',t:'Tentativi a testa',v:[[1,'1 solo'],[3,'3 (conta il migliore)'],[5,'5 (conta il migliore)']],d:1}],
 dash:[
  {k:'diff',t:'Livello',v:[[1,'Facile: lento e pochi ostacoli'],[2,'Normale'],[3,'Difficile: veloce, buche e spine doppie'],[4,'Esperto: velocissimo e fitto']],d:1},
  {k:'tries',t:'Tentativi a testa',v:[[1,'1 solo'],[3,'3 (conta il migliore)'],[5,'5 (conta il migliore)']],d:1}],
 golf:[
  {k:'diff',t:'Livello',v:[[1,'Facile'],[2,'Normale'],[3,'Difficile'],[4,'Esperto']],d:1,h:'Più sale il livello, più la buca è piccola e più ostacoli ci sono.'},
  {k:'holes',t:'Numero di buche',v:[[3,'3'],[6,'6'],[9,'9']],d:0},
  {k:'bump',t:'Bumper',v:[[1,'Sì'],[0,'No']],d:0},
  {k:'size',t:'Campo',v:[['r','Casuale (anche grande)'],['s','Piccolo']],d:0}]
};
const defCfg=id=>{const c={};(OPTS[id]||[]).forEach(o=>{c[o.k]=o.v[o.d][0]});return c};
const FLEETS={s:{size:6,lens:[3,2,2]},m:{size:8,lens:[4,3,3,2,2]},l:{size:10,lens:[5,4,3,3,2]}};
const NAMEOF={q20:'20 domande',tris:'Tris',mem:'Memory',c4:'Forza 4',bs:'Battaglia navale',arch:'Tiro con l\'arco',golf:'Mini golf'};

function finish(n,w){
  n.w=w; n.peg=pick(D.PEGNI[n.th==='hot'?'hot':'rom']);
  DU.addScore(w,n.type);
}
function endBlock(g,detail){
  if(!g.w)return '';
  const head=g.w==='D'?'Pareggio':'Ha vinto '+esc(nm(g.w));
  return `<div class="win"><p class="eyebrow">Partita finita</p><h3>${head}</h3>${detail?`<p>${detail}</p>`:''}
   <p><b>Pegno:</b> ${esc(g.peg||'')}</p>
   <div class="actions">${g.saved?'':'<button class="btn sm" data-act="g-tl">Salva nella timeline</button>'}<button class="btn sm ghost" data-act="g-again">Rigioca</button><button class="btn sm ghost" data-act="g-close">Chiudi la partita</button></div></div>`;
}
function statusLine(g){
  if(g.w)return '';
  const mine=g.turn===me();
  return `<p class="sub" style="display:flex;align-items:center;gap:8px"><i class="dot ${g.turn}"></i>${S.mode==='local'||!mine?'Tocca a '+esc(nm(g.turn)):'Tocca a te'}</p>`;
}

/* ---------- Nuova partita ---------- */
function openSetup(id,th,cfg){
  if(th==='hot'&&!DU.hotOn()){DU.toast('Servono il sì di tutti e due, nella sezione Noi.');return}
  if(!OPTS[id]){startGame(id,th,{});return}
  S.gset={g:id,th:th,cfg:Object.assign(defCfg(id),cfg||{})}; DU.render(true);
}
function startGame(id,th,cfg,x){
  if(th==='hot'&&!DU.hotOn()){DU.toast('Servono il sì di tutti e due, nella sezione Noi.');return}
  const rnd=(x&&x.rnd)||rndG, pick=a=>a[rnd(a.length)];
  const g={type:id,th:th,cfg:cfg||{},turn:pick(['A','B']),w:null,at:(x&&x.at)||Date.now(),saved:false};
  if(x&&x.id)g.id=x.id;
  if(id==='c4'){const d=c4dims(g);g.b=Array(d.C*d.R).fill('');g.mv=0}
  else if(id==='bs'){const f=FLEETS[g.cfg.fleet||'m'];g.size=f.size;g.lens=f.lens;g.ships={A:null,B:null};g.ready={A:false,B:false};g.shots={A:[],B:[]};g.phase='place';g.turn='A';S.bsp=null;S.bsel=null}
  else if(id==='ic'){
    let cards;
    if(th==='ric'){
      const ev=DU.events().slice(0,12);
      if(ev.length<6){DU.toast('Servono almeno 6 momenti nella timeline.');return}
      cards=ev.map(e=>({l:e.title,id:e.id,tg:evTags(e)}));
    }else cards=D.IC[th].cards.map(c=>({l:c[0],tg:c[1].split(' ')}));
    g.cards=cards;g.pick={A:null,B:null};g.phase='pick';g.log=[];g.turn='A';
    S.icElim={at:g.at,A:[],B:[]};S.icGuess=false;
  }
  else if(id==='q20'){g.setter=pick(['A','B']);g.guesser=other(g.setter);g.phase='set';g.turn=g.setter;g.secret=null;g.log=[]}
  else if(id==='tris'){const N=+(g.cfg.sz||3);g.b=Array(N*N).fill('');g.mv=0}
  else if(id==='mem'){
    const E=['🌹','🎈','🍓','🌙','🐱','🎧','☕','🍀','🦋','🎁','🍉','🌻'];
    const n=+(g.cfg.pairs||8), c=E.slice(0,n).concat(E.slice(0,n));
    for(let i=c.length-1;i>0;i--){const j=rnd(i+1);[c[i],c[j]]=[c[j],c[i]]}
    g.cards=c;g.open=[];g.mo=Array(c.length).fill('');g.pc={A:0,B:0}
  }
  else if(id==='arch'||id==='golf'||id==='flap'||id==='dash'){g.s={A:null,B:null};g.seed=1+rnd(1e9);delete g.turn}
  S.gset=null;
  DU.saveGame(g);
  if(S.mode==='local'&&g.turn&&!ginfo(id).hidden)DU.setActive(g.turn);
}
function evTags(e){
  const m=+(e.date||'2000-01-01').split('-')[1], tg=[];
  tg.push(m===12||m<=2?'inverno':m<=5?'primavera':m<=8?'estate':'autunno');
  if(e.th||(e.ths&&e.ths.length))tg.push('foto'); tg.push('by'+e.by);
  if(DU.dnum(DU.todayStr())-DU.dnum(e.date||DU.todayStr())<=365)tg.push('recente');
  return tg;
}

/* ---------- Forza 4 ---------- */
function c4dims(g){const p=String((g.cfg&&g.cfg.size)||'7x6').split('x').map(Number);return {C:p[0]||7,R:p[1]||6}}
function c4find(b,C,R,w){
  const set=new Set(), dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){
    if(b[r*C+c]!==w)continue;
    dirs.forEach(d=>{
      const cells=[];
      for(let k=0;k<4;k++){const rr=r+d[0]*k,cc=c+d[1]*k;if(rr<0||rr>=R||cc<0||cc>=C||b[rr*C+cc]!==w)return;cells.push(rr*C+cc)}
      cells.forEach(x=>set.add(x));
    });
  }
  return [...set];
}
function c4drop(c){
  const g=S.game; if(!g||g.w||!actorOK(g))return;
  const d=c4dims(g); let r=d.R-1; while(r>=0&&g.b[r*d.C+c])r--;
  if(r<0){DU.toast('Colonna piena');return}
  const n=clone(g), who=g.turn; n.b[r*d.C+c]=who; n.mv=(g.mv||0)+1; n.last={r:r,c:c,k:'d'};
  const wl=c4find(n.b,d.C,d.R,who);
  if(wl.length){n.line=wl;finish(n,who)} else if(n.b.every(x=>x)){finish(n,'D')} else n.turn=other(who);
  try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}
  DU.saveGame(n);
  if(S.mode==='local'&&!n.w)DU.setActive(n.turn);
}
function c4pop(c){
  const g=S.game; if(!g||g.w||!actorOK(g))return;
  const d=c4dims(g), who=g.turn;
  if(g.b[(d.R-1)*d.C+c]!==who){DU.toast('Puoi togliere solo un tuo disco dalla riga in basso.');return}
  const n=clone(g);
  for(let r=d.R-1;r>=1;r--)n.b[r*d.C+c]=n.b[(r-1)*d.C+c];
  n.b[c]=''; n.mv=(g.mv||0)+1; n.last={c:c,k:'p'};
  const wm=c4find(n.b,d.C,d.R,who), wo=c4find(n.b,d.C,d.R,other(who));
  if(wm.length){n.line=wm;finish(n,who)} else if(wo.length){n.line=wo;finish(n,other(who))} else n.turn=other(who);
  DU.saveGame(n);
  if(S.mode==='local'&&!n.w)DU.setActive(n.turn);
}
function c4html(g){
  const pv=getPend(g), d=c4dims(g), pop=!!(g.cfg&&g.cfg.pop), line=new Set(g.line||[]), L=g.last;
  const cols=[...Array(d.C).keys()].map(c=>`<button class="c4col" data-act="g-c4" data-c="${c}" aria-label="Colonna ${c+1}" ${g.w?'disabled':''}>${[...Array(d.R).keys()].map(r=>{
    const v=g.b[r*d.C+c], isLast=L&&L.k==='d'&&L.r===r&&L.c===c, slid=L&&L.k==='p'&&L.c===c&&v&&r>0;
    const gh=pv===c&&!v&&(r===d.R-1||g.b[(r+1)*d.C+c]);
    return `<i class="disc ${gh?g.turn+' ghost':v} ${line.has(r*d.C+c)?'w':''} ${isLast?'drop':''} ${slid?'slide':''}" ${isLast?`style="--fall:${r+1}"`:''}></i>`;
  }).join('')}</button>`).join('');
  const popRow=pop&&!g.w?`<div class="c4pop" style="--C:${d.C}">${[...Array(d.C).keys()].map(c=>`<button class="c4pb ${pv==='p'+c?'sel':''}" data-act="g-c4pop" data-c="${c}" ${g.b[(d.R-1)*d.C+c]===g.turn&&actorOK(g)?'':'disabled'} aria-label="Togli il disco in colonna ${c+1}">↑</button>`).join('')}</div><p class="note" style="text-align:center">Pop out: tocca la freccia sotto una colonna per togliere un tuo disco dal fondo.</p>`:'';
  return `${statusLine(g)}<div class="c4 ${g.th}" style="--C:${d.C};--R:${d.R}">${cols}</div>${popRow}${sendBtn(g,pv!==null)}
   <p class="note"><span class="dot"></span> ${esc(nm('A'))} · <span class="dot B"></span> ${esc(nm('B'))} · mossa ${g.mv||0}</p>${endBlock(g,g.line?'Quattro in fila!':'')}`;
}

/* ---------- Mossa in sospeso: scegli, poi premi Invia ---------- */
const pkey=g=>g.at+'|'+(g.mv||0)+'|'+g.turn;
const getPend=g=>S.pend&&S.pend.k===pkey(g)?S.pend.v:null;
const setPend=(g,v)=>{S.pend={k:pkey(g),v:v};DU.render(true)};
const sendBtn=(g,on)=>(!g.w&&actorOK(g))?`<div class="actions" style="justify-content:center"><button class="btn" data-act="g-send" ${on?'':'disabled'}>${on?'Invia la mossa':'Scegli una mossa'}</button></div>`:'';
function sendMove(){
  const g=S.game; if(!g||g.w||!actorOK(g))return; const v=getPend(g); if(v===null)return;
  S.pend=null;
  if(g.type==='c4'){if(typeof v==='string')c4pop(+v.slice(1));else c4drop(v)}
  else if(g.type==='tris')ttTap(v);
}
/* ---------- 20 domande ---------- */
const Q20A={y:'Sì',n:'No',m:'Forse',x:'Non so'}, Q20CAT={any:'qualsiasi cosa',animale:'un animale',oggetto:'un oggetto',persona:'una persona',luogo:'un luogo',cibo:'un cibo'};
function q20In(){const e=document.getElementById('q20in');return e?e.value.trim():''}
function q20Set(){
  const g=S.game; if(!g||g.phase!=='set'||!actorOK(g))return; const v=q20In();
  if(v.length<2){DU.toast('Scrivi cosa devono indovinare.');return}
  const n=clone(g); n.secret=v.slice(0,60); n.phase='play'; n.turn=n.guesser; DU.saveGame(n);
}
function q20Ask(guess){
  const g=S.game; if(!g||g.phase!=='play'||g.turn!==g.guesser||!actorOK(g)||g.w)return; const v=q20In();
  if(v.length<2){DU.toast(guess?'Scrivi cosa pensi che sia.':'Scrivi la domanda.');return}
  const n=clone(g); n.log.push({q:v.slice(0,100),a:null,gu:!!guess}); n.turn=n.setter; DU.saveGame(n);
}
function q20Ans(a){
  const g=S.game; if(!g||g.phase!=='play'||g.turn!==g.setter||!actorOK(g)||g.w)return;
  const n=clone(g), e=n.log[n.log.length-1]; if(!e||e.a)return; e.a=a;
  if(e.gu&&a==='y'){finish(n,n.guesser)}
  else if(n.log.length>=(+n.cfg.n||20)){finish(n,n.setter)}
  else n.turn=n.guesser;
  DU.saveGame(n);
}
function q20HTML(g){
  const N=+g.cfg.n||20, used=g.log.length, mine=actorOK(g), set=nm(g.setter), gu=nm(g.guesser), cat=Q20CAT[g.cfg.cat||'any'];
  const log=g.log.map((e,i)=>`<li class="${e.a?'a-'+e.a:''}"><span class="qn">${i+1}</span><span class="qt">${e.gu?'🎯 ':''}${esc(e.q)}</span><span class="qa">${e.a?(e.gu?(e.a==='y'?'Giusto!':'Sbagliato'):Q20A[e.a]):'…'}</span></li>`).join('');
  const head=`<div class="q20h"><span class="chip"><i class="dot ${g.setter}"></i>${esc(set)} pensa</span><span class="chip"><i class="dot ${g.guesser}"></i>${esc(gu)} indovina</span><span class="chip q20c">${Math.min(used,N)}/${N}</span></div><p class="note" style="text-align:center">${g.th==='hot'?'Versione hot: vale tutto, anche le cose piccanti 😏. ':''}Si deve indovinare ${esc(cat)}.</p>`;
  let act='';
  if(g.w){
    act=`<div class="q20r"><p class="eyebrow">Il segreto era</p><h3>${esc(g.secret)}</h3></div>`;
  }else if(g.phase==='set'){
    act=mine?`<div class="q20f"><p class="lead" style="font-size:16px">${esc(set)}, a cosa pensi? (${esc(cat)})</p><input id="q20in" maxlength="60" autocomplete="off" placeholder="Scrivilo qui, ${esc(gu)} non lo vede"><button class="btn" data-act="g-q20set">Conferma il segreto</button></div>`:`<p class="lead" style="font-size:16px">${esc(set)} sta pensando a qualcosa…</p>`;
  }else if(g.turn===g.guesser){
    act=mine?`<div class="q20f"><p class="lead" style="font-size:16px">${esc(gu)}, ${used?'tocca a te':'fai la prima domanda'}. Rimaste: ${N-used}</p><input id="q20in" maxlength="100" autocomplete="off" placeholder="Domanda sì/no, oppure cosa pensi che sia"><div class="actions"><button class="btn" data-act="g-q20ask">Fai la domanda</button><button class="btn ghost" data-act="g-q20guess">🎯 Provo a indovinare</button></div></div>`:`<p class="lead" style="font-size:16px">${esc(gu)} sta pensando alla prossima domanda…</p>`;
  }else{
    const e=g.log[g.log.length-1];
    act=mine?`<div class="q20f"><p class="note">Il tuo segreto: <b>${esc(g.secret)}</b></p><p class="lead" style="font-size:17px">${e.gu?'Prova a indovinare: ':''}«${esc(e.q)}»</p><div class="actions">${e.gu?`<button class="btn" data-act="g-q20ans" data-a="y">Giusto!</button><button class="btn ghost" data-act="g-q20ans" data-a="n">Sbagliato</button>`:`<button class="btn" data-act="g-q20ans" data-a="y">Sì</button><button class="btn ghost" data-act="g-q20ans" data-a="n">No</button><button class="btn ghost" data-act="g-q20ans" data-a="m">Forse</button><button class="btn ghost" data-act="g-q20ans" data-a="x">Non so</button>`}</div></div>`:`<p class="lead" style="font-size:16px">${esc(set)} sta rispondendo…</p>`;
  }
  return `${head}${act}<ol class="q20l">${log||'<li class="empty">Le domande appariranno qui.</li>'}</ol>${endBlock(g,g.w===g.guesser?esc(gu)+' ha indovinato in '+used+(used===1?' domanda':' domande'):esc(gu)+' non ce l\'ha fatta')}`;
}
/* ---------- Tris ---------- */
const ttSym=(g,w)=>g.th==='hot'?(w==='A'?'🍆':'🍑'):(w==='A'?'✕':'○');
function ttWin(b,N,K,w){
  const set=new Set(), dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(b[r*N+c]!==w)continue;
    dirs.forEach(d=>{const cells=[];for(let k=0;k<K;k++){const rr=r+d[0]*k,cc=c+d[1]*k;if(rr<0||rr>=N||cc<0||cc>=N||b[rr*N+cc]!==w)return;cells.push(rr*N+cc)}cells.forEach(x=>set.add(x))});
  }
  return [...set];
}
function ttTap(i){
  const g=S.game; if(!g||g.w||!actorOK(g)||g.b[i])return;
  const N=+(g.cfg.sz||3), K=N===3?3:N===5?4:5, n=clone(g), who=g.turn;
  n.b[i]=who; n.mv=(g.mv||0)+1; n.last=i;
  const wl=ttWin(n.b,N,K,who);
  if(wl.length){n.line=wl;finish(n,who)} else if(n.b.every(x=>x)){finish(n,'D')} else n.turn=other(who);
  try{navigator.vibrate&&navigator.vibrate(10)}catch(e){}
  DU.saveGame(n);
  if(S.mode==='local'&&!n.w)DU.setActive(n.turn);
}
function ttHTML(g){
  const N=+(g.cfg.sz||3), line=new Set(g.line||[]), pv=getPend(g);
  const cells=g.b.map((v,i)=>`<button class="tcell ${v||(pv===i?g.turn+' gh':'')} ${line.has(i)?'w':''} ${g.last===i?'new':''}" data-act="g-tt" data-i="${i}" ${v||g.w?'disabled':''} aria-label="Casella ${i+1}">${v?ttSym(g,v):(pv===i?ttSym(g,g.turn):'')}</button>`).join('');
  return `${statusLine(g)}<div class="tris ${g.th}" style="--N:${N}">${cells}</div>${sendBtn(g,pv!==null)}
   <p class="note"><span class="dot"></span> ${esc(nm('A'))} ${ttSym(g,'A')} · <span class="dot B"></span> ${esc(nm('B'))} ${ttSym(g,'B')}</p>${endBlock(g,g.line?(N===3?'Tre in fila!':N===5?'Quattro in fila!':'Cinque in fila!'):'')}`;
}

/* ---------- Memory ---------- */
function memTap(i){
  const g=S.game; if(!g||g.w||!actorOK(g)||g.mo[i]||g.open.indexOf(i)>=0||g.open.length>=2)return;
  const n=clone(g), who=g.turn; n.open.push(i);
  if(n.open.length===2){
    const a=n.open[0],b=n.open[1];
    if(n.cards[a]===n.cards[b]){
      n.mo[a]=n.mo[b]=who; n.pc[who]++; n.open=[]; n.lastm=[a,b];
      if(n.mo.every(x=>x)){const w=n.pc.A>n.pc.B?'A':n.pc.B>n.pc.A?'B':'D';finish(n,w)}
    }
  }
  try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
  DU.saveGame(n);
}
function memNext(){
  const g=S.game; if(!g||g.w||!actorOK(g)||g.open.length<2)return;
  const n=clone(g); n.open=[]; n.turn=other(g.turn); n.lastm=null;
  if(+(g.cfg&&g.cfg.mix)){ /* livello esperto: le carte ancora coperte cambiano posto */
    const idx=n.mo.map((o,i)=>o?-1:i).filter(i=>i>=0), vals=idx.map(i=>n.cards[i]);
    for(let i=vals.length-1;i>0;i--){const j=rnd(i+1);[vals[i],vals[j]]=[vals[j],vals[i]]}
    idx.forEach((k,x)=>{n.cards[k]=vals[x]});
  }
  DU.saveGame(n);
  if(S.mode==='local')DU.setActive(n.turn);
}
function memHTML(g){
  const miss=g.open.length===2, nc=g.cards.length, cols=nc<=12?4:nc<=16?4:5;
  const cells=g.cards.map((c,i)=>{
    const o=g.mo[i], up=!!o||g.open.indexOf(i)>=0;
    return `<button class="mcard ${up?'up':''} ${o||''} ${g.lastm&&g.lastm.indexOf(i)>=0?'hit':''}" data-act="g-mem" data-i="${i}" ${up||g.w||miss?'disabled':''} aria-label="Carta ${i+1}"><span class="mf">${up?c:''}</span></button>`;
  }).join('');
  const nx=miss&&!g.w&&actorOK(g)?`<div class="actions" style="justify-content:center"><button class="btn" data-act="g-memnext">Non è una coppia: passa il turno</button></div>`:(miss&&!g.w?'<p class="note" style="text-align:center">Non è una coppia. Aspetta il turno.</p>':'');
  return `${statusLine(g)}<div class="mem ${g.th}" style="--C:${cols}">${cells}</div>${nx}
   <p class="note" style="text-align:center"><span class="dot"></span> ${esc(nm('A'))} ${g.pc.A} coppie · <span class="dot B"></span> ${esc(nm('B'))} ${g.pc.B} coppie</p>${endBlock(g,g.w?`${g.pc.A} a ${g.pc.B}`:'')}`;
}

/* ---------- Battaglia navale ---------- */
/* Fase 1: ognuno piazza la propria flotta (nascosta all'altro). Fase 2: mira, poi fuoco. */
const bsGlyph=(id,hot)=>hot?(id%2?'🍑':'🍆'):'';
function bsCells(sz,h,r,c,l){const a=[];for(let k=0;k<l;k++){const rr=h?r:r+k,cc=h?c+k:c;if(rr<0||cc<0||rr>=sz||cc>=sz)return null;a.push(rr*sz+cc)}return a}
function bsOK(g,ships,cells){
  const occ=new Set(); ships.forEach(s=>s.c.forEach(x=>occ.add(x)));
  if(cells.some(x=>occ.has(x)))return false;
  if(!(g.cfg&&g.cfg.touch)){
    const sz=g.size;
    for(const x of cells){const r=Math.floor(x/sz),c=x%sz;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&cc>=0&&rr<sz&&cc<sz&&occ.has(rr*sz+cc))return false}}
  }
  return true;
}
function bsRandom(g){
  for(let tries=0;tries<50;tries++){
    const ships=[]; let ok=true;
    g.lens.forEach((l,id)=>{
      let placed=false;
      for(let t=0;t<300&&!placed;t++){const h=Math.random()<.5,cells=bsCells(g.size,h,rnd(g.size),rnd(g.size),l);if(cells&&bsOK(g,ships,cells)){ships.push({id:id,l:l,c:cells,h:h});placed=true}}
      if(!placed)ok=false;
    });
    if(ok)return ships;
  }
  return [];
}
function bsMe(g){return S.mode==='local'?g.turn:me()}
function bsPState(g){
  const m=bsMe(g); if(!S.bsp||S.bsp.at!==g.at||S.bsp.m!==m)S.bsp={at:g.at,m:m,ships:[],h:true};
  return S.bsp;
}
function bsNextId(g,st){for(let i=0;i<g.lens.length;i++)if(!st.ships.some(s=>s.id===i))return i;return -1}
function bsPlace(i){
  const g=S.game; if(!g||g.phase!=='place')return; const st=bsPState(g), m=st.m;
  if(g.ready[m])return;
  const hit=st.ships.findIndex(s=>s.c.includes(i));
  if(hit>=0){
    if(st.hold!=null&&st.holdOld)st.ships.push(st.holdOld);
    const sh=st.ships.splice(hit,1)[0]; st.hold=sh.id; st.holdOld=sh; st.h=sh.h; DU.rq(); return}
  const id=st.hold!=null?st.hold:bsNextId(g,st); if(id<0){DU.toast('Hai già piazzato tutte le navi: tocca una nave per spostarla.');return}
  const l=g.lens[id], sz=g.size; let r=Math.floor(i/sz), c=i%sz;
  if(st.h)c=Math.min(c,sz-l); else r=Math.min(r,sz-l);
  const cells=bsCells(sz,st.h,r,c,l);
  if(!cells||!bsOK(g,st.ships,cells)){DU.toast(g.cfg.touch?'Qui si sovrappone a un\'altra nave.':'Le navi devono stare distanti: prova un altro punto.');return}
  st.ships.push({id:id,l:l,c:cells,h:st.h}); st.hold=null; st.holdOld=null; DU.rq();
}
function bsSubmit(at,m,mine){
  DU.mergeGame(n=>{
    if(!n||n.type!=='bs'||n.at!==at||n.phase!=='place')return n;
    n.ships[m]=mine; n.ready[m]=true;
    if(n.ready.A&&n.ready.B){n.phase='play';n.turn=pick(['A','B'])}
    else if(S.mode==='local')n.turn=other(m);
    return n;
  });
  clearTimeout(S.bsT);
  S.bsT=setTimeout(function chk(){bsRetry();if(S.bsSent)S.bsT=setTimeout(chk,1800+rnd(1800))},1800+rnd(1800));
}
function bsReady(){
  const g=S.game; if(!g||g.phase!=='place')return; const st=bsPState(g), m=st.m, at=g.at;
  if(st.ships.length!==g.lens.length){DU.toast('Piazza tutte le navi.');return}
  const mine=st.ships.slice().sort((x,y)=>x.id-y.id);
  S.bsSent={at:at,m:m,ships:mine,t:Date.now()};
  bsSubmit(at,m,mine);
  S.bsp=null; S.bsel=null;
}
/* se i due telefoni scrivono quasi insieme una scrittura può perdersi: si rimanda finché non risulta */
function bsRetry(){
  const x=S.bsSent; if(!x)return; const g=S.game;
  if(!g||g.type!=='bs'||g.at!==x.at||g.phase!=='place'){S.bsSent=null;return}
  if(!g.ready[x.m]&&Date.now()-x.t>1500){x.t=Date.now();bsSubmit(x.at,x.m,x.ships)}
}
function bsSunk(g,by){ /* navi dell'avversario di "by" affondate */
  const o=other(by), sh=g.shots[by]; return (g.ships[o]||[]).filter(s=>s.c.every(x=>sh.includes(x)));
}
function bsFire(){
  const g=S.game; if(!g||g.w||g.phase!=='play'||!actorOK(g))return;
  const i=S.bsel; if(i===null||i===undefined){DU.toast('Tocca una casella per mirare.');return}
  const m=g.turn, o=other(m); if(g.shots[m].includes(i))return;
  const n=clone(g), ship=n.ships[o].find(s=>s.c.includes(i));
  n.shots[m].push(i);
  const sunk=ship&&ship.c.every(x=>n.shots[m].includes(x))?ship.l:0;
  n.last={by:m,i:i,hit:!!ship,sunk:sunk,k:(n.last?n.last.k:0)+1};
  S.bsel=null;
  if(n.ships[o].every(s=>s.c.every(x=>n.shots[m].includes(x))))finish(n,m);
  else if(!(ship&&n.cfg.bonus))n.turn=o;
  try{navigator.vibrate&&navigator.vibrate(ship?[20,40,20]:10)}catch(e){}
  DU.saveGame(n);
}
function bsShipCls(s,i){
  const k=s.c.indexOf(i), pos=k===0?'s':k===s.c.length-1?'e':'m';
  return 'sh '+(s.h?'h':'v')+' '+pos;
}
function bsPlaceHTML(g){
  const st=bsPState(g), m=st.m, sz=g.size, hot=g.th==='hot', ready=g.ready[m];
  if(ready||(S.bsSent&&S.bsSent.at===g.at&&S.bsSent.m===m))return `<p class="lead" style="font-size:16px">Flotta pronta. ${S.mode==='local'?'':'Aspettiamo '+esc(nm(other(m)))+'…'}</p>`;
  const cell=i=>{const s=st.ships.find(x=>x.c.includes(i));return s?`<button class="bc ${bsShipCls(s,i)} ${hot?'hotg':''}" data-act="g-bsplace" data-i="${i}" aria-label="Nave">${hot?bsGlyph(s.id,true):''}</button>`:`<button class="bc" data-act="g-bsplace" data-i="${i}" aria-label="Acqua"></button>`};
  const nid=st.hold!=null?st.hold:bsNextId(g,st), allIn=bsNextId(g,st)<0&&st.hold==null;
  const fleet=g.lens.map((l,id)=>`<span class="fl ${st.ships.some(s=>s.id===id)?'ok':''} ${id===nid?'cur':''}">${hot?bsGlyph(id,true).repeat(Math.min(l,3)):''}${hot?'':'▮'.repeat(l)} ${l}</span>`).join('');
  return `<p class="note">${esc(nm(m))}, piazza le tue navi: ${st.hold!=null?'hai preso una nave: toccala dove vuoi metterla (puoi ruotarla), oppure annulla.':'tocca la griglia per mettere la nave evidenziata. Tocca una nave già piazzata per prenderla e spostarla.'}</p>
   <div class="fleet">${fleet}</div>
   <div class="bgrid ${g.th}" style="--n:${sz}">${[...Array(sz*sz).keys()].map(cell).join('')}</div>
   <div class="actions" style="justify-content:center;margin-top:10px"><button class="btn sm ghost" data-act="g-bsrot">${st.h?'Orizzontale ↔':'Verticale ↕'} · ruota</button><button class="btn sm ghost" data-act="g-bsrand">Casuale</button><button class="btn sm ghost" data-act="g-bsclr">Pulisci</button>${st.hold!=null&&st.holdOld?'<button class="btn sm" data-act="g-bsundo">Annulla spostamento</button>':''}</div>
   <div class="actions" style="justify-content:center"><button class="btn" data-act="g-bsready" ${allIn?'':'disabled'}>Pronto</button></div>`;
}
function bsPlayHTML(g){
  const m=bsMe(g), o=other(m), sz=g.size, mineTurn=g.turn===m, hot=g.th==='hot', n=S.game.last;
  const mySunk=bsSunk(g,m), sunkIds=new Set(mySunk.map(s=>s.id));
  const sel=S.bsel;
  const tgt=[...Array(sz*sz).keys()].map(i=>{
    const sh=g.shots[m].includes(i), ship=g.ships[o].find(s=>s.c.includes(i)), hit=sh&&ship;
    const reveal=ship&&(sunkIds.has(ship.id)||g.w);
    let cls='bc', inner='';
    if(reveal){cls+=' '+bsShipCls(ship,i)+' sunk '+(hot?'hotg':'');inner=hot?bsGlyph(ship.id,true):''}
    else if(hit){cls+=' hit';inner=hot?'💦':'💥'}
    else if(sh)cls+=' miss';
    if(sel===i&&!sh)cls+=' aim';
    if(n&&n.by===m&&n.i===i)cls+=' pop';
    return `<button class="${cls}" data-act="g-bs" data-i="${i}" ${(sh||g.w||!mineTurn)?'disabled':''} aria-label="Casella ${i+1}">${inner}</button>`;
  }).join('');
  const own=[...Array(sz*sz).keys()].map(i=>{
    const ship=g.ships[m].find(s=>s.c.includes(i)), sh=g.shots[o].includes(i);
    let cls='bc', inner='';
    if(ship){cls+=' '+bsShipCls(ship,i)+(hot?' hotg':'');inner=sh?(hot?'💦':'💥'):(hot?bsGlyph(ship.id,true):'')}
    else if(sh)cls+=' miss';
    return `<span class="${cls}">${inner}</span>`;
  }).join('');
  const total=g.lens.length, lastTxt=n?`<p class="bslast ${n.hit?'y':'n'}"><b>${esc(nm(n.by))}</b>: ${n.sunk?'affondata una nave da '+n.sunk+'!':n.hit?'colpito!':'acqua.'}</p>`:'';
  const mine2=bsSunk(g,o).length;
  const canFire=mineTurn&&!g.w&&sel!==null&&sel!==undefined;
  return `${statusLine(g)}${lastTxt}
   <p class="eyebrow">Acque di ${esc(nm(o))} · affondate ${mySunk.length} su ${total}</p>
   <div class="bgrid ${g.th}" style="--n:${sz}">${tgt}</div>
   ${g.w?'':`<div class="actions" style="justify-content:center;margin:10px 0"><button class="btn fire" data-act="g-bsfire" ${canFire?'':'disabled'}>${hot?'💦':'💥'} Fuoco!</button></div>`}
   <p class="eyebrow" style="margin-top:8px">La tua flotta · persi ${mine2} su ${total}</p><div class="bgrid mini ${g.th}" style="--n:${sz}">${own}</div>${endBlock(g,g.w?'Flotta nemica distrutta.':'')}`;
}
function bsHTML(g){return g.phase==='place'?bsPlaceHTML(g):bsPlayHTML(g)}

/* ---------- Indovina chi ---------- */
function icQs(g){
  const src=g.th==='ric'?D.IC.ric.qs:D.IC[g.th].qs;
  return src.map(q=>[q[0],q[1].replace('{A}',nm('A')).replace('{B}',nm('B'))]);
}
function icThumb(c){
  if(!c.id)return '';
  const e=DU.events().find(x=>x.id===c.id); const s=e&&DU.safeImg(e.th);
  return s?`<img src="${s}" alt="">`:'';
}
function icPick(i){
  const g=S.game; if(!g||g.phase!=='pick')return;
  const m=S.mode==='local'?g.turn:me(); if(g.turn!==m||g.pick[m]!==null)return;
  const n=clone(g); n.pick[m]=i;
  if(n.pick.A!==null&&n.pick.B!==null){n.phase='play';n.turn=pick(['A','B'])} else n.turn=other(m);
  DU.saveGame(n);
}
function icAsk(tag,text){
  const g=S.game; if(!g||g.phase!=='play'||g.w||!actorOK(g))return;
  const m=g.turn, o=other(m), card=g.cards[g.pick[o]];
  const n=clone(g); n.log.push({by:m,tag:tag,q:text,r:card.tg.includes(tag)}); n.turn=o;
  S.icGuess=false; DU.saveGame(n);
}
function icGuess(i){
  const g=S.game; if(!g||g.phase!=='play'||g.w||!actorOK(g))return;
  const m=g.turn, o=other(m), n=clone(g); n.guessed=i; S.icGuess=false;
  finish(n,i===g.pick[o]?m:o); DU.saveGame(n);
}
function icHTML(g){
  const m=S.mode==='local'?g.turn:me(), o=other(m);
  if(!S.icElim||S.icElim.at!==g.at)S.icElim={at:g.at,A:[],B:[]};
  const el=S.icElim[m]||[];
  if(g.phase==='pick'){
    const picked=g.pick[m]!==null, mineTurn=g.turn===m;
    const cards=g.cards.map((c,i)=>`<button class="icc ${g.pick[m]===i?'me':''}" data-act="g-icpick" data-i="${i}" ${(!mineTurn||picked)?'disabled':''}>${icThumb(c)}<span>${esc(c.l)}</span></button>`).join('');
    return `<p class="lead" style="font-size:16px">${picked?'Carta scelta. Aspettiamo '+esc(nm(o))+'.':(mineTurn?esc(nm(m))+', scegli la tua carta segreta.':'Tocca a '+esc(nm(g.turn))+' scegliere la carta.')}</p><div class="icg">${cards}</div>`;
  }
  const mineTurn=g.turn===m, myc=g.cards[g.pick[m]];
  const asked=new Set(g.log.filter(x=>x.by===m).map(x=>x.tag));
  const qs=icQs(g).filter(q=>!asked.has(q[0])).map(q=>`<button class="chip" data-act="g-icq" data-tag="${esc(q[0])}" data-q="${esc(q[1])}" ${(!mineTurn||g.w)?'disabled':''}>${esc(q[1])}</button>`).join('');
  const cards=g.cards.map((c,i)=>`<button class="icc ${el.includes(i)?'out':''} ${g.pick[m]===i?'me':''}" data-act="${S.icGuess&&mineTurn&&!g.w?'g-icg':'g-icel'}" data-i="${i}">${icThumb(c)}<span>${esc(c.l)}</span></button>`).join('');
  const log=g.log.slice(-8).map(x=>`<p><b>${esc(nm(x.by))}</b>: ${esc(x.q)} <b class="${x.r?'y':'n'}">${x.r?'Sì':'No'}</b></p>`).join('')||'<p class="note">Nessuna domanda ancora.</p>';
  const detail=g.w?`La carta di ${esc(nm(o))} era: <b>${esc(g.cards[g.pick[o]].l)}</b>`:'';
  return `${statusLine(g)}<p class="note">La tua carta segreta: <b>${esc(myc.l)}</b>. Tocca le carte per scartarle.</p>
   ${g.w?'':(mineTurn?`<div class="qlist">${qs}</div><div class="actions"><button class="btn sm ${S.icGuess?'':'ghost'}" data-act="g-icmode">${S.icGuess?'Annulla tentativo':'Ho indovinato!'}</button></div>`:'<p class="note">Aspetta il tuo turno per fare una domanda.</p>')}
   ${S.icGuess&&mineTurn?'<p class="banner">Tocca la carta che pensi sia quella di '+esc(nm(o))+'. Se sbagli, perdi.</p>':''}
   <div class="icg">${cards}</div><div class="log card">${log}</div>${endBlock(g,detail)}`;
}


/* ---------- Arco e golf: punteggi ---------- */
function scoreHTML(g,unit,hint){
  const row=s=>{
    const v=g.s[s], can=v===null&&(S.mode==='local'||s===me());
    return `<div class="pill ${s}"><i class="dot ${s}"></i><span class="who">${esc(nm(s))}</span><span class="val">${v===null?'da giocare':v+' '+unit}</span>
      ${can&&!g.w?`<button class="btn sm" style="margin-left:auto" data-act="g-play" data-s="${s}">Gioca</button>`:''}</div>`;
  };
  const detail=g.w?`${esc(nm('A'))} ${g.s.A} · ${esc(nm('B'))} ${g.s.B}`:'';
  return `<p class="note">${hint}</p><div class="pairs">${row('A')}${row('B')}</div>${endBlock(g,detail)}`;
}
function endPlay(score){
  const p=S.play; if(!p)return;
  S.play=null; S.freeze=false;
  DU.mergeGame(n=>{
    if(!n||n.type!==p.g)return n;
    n.s[p.slot]=score;
    if(n.s.A!==null&&n.s.B!==null){
      const a=n.s.A,b=n.s.B;
      finish(n,a===b?'D':(p.g==='golf'?(a<b?'A':'B'):(a>b?'A':'B')));
    }
    return n;
  },p.id);
}
function heartPath(c,x,y,s){
  c.beginPath(); c.moveTo(x,y+s*.3);
  c.bezierCurveTo(x,y,x-s*.5,y,x-s*.5,y+s*.3);
  c.bezierCurveTo(x-s*.5,y+s*.6,x,y+s*.75,x,y+s);
  c.bezierCurveTo(x,y+s*.75,x+s*.5,y+s*.6,x+s*.5,y+s*.3);
  c.bezierCurveTo(x+s*.5,y,x,y,x,y+s*.3); c.closePath();
}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function fitCanvas(cv,W,H){const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return c}

/* ---------- Tiro con l'arco (prima persona: tendi, mira, vento, rilascia) ---------- */
function mountArch(cv,th,cfg,seed){
  const W=320, H=480, ctx=fitCanvas(cv,W,H), hot=th==='hot';
  const N=cfg.n||5, wl=cfg.wind||0, mov=!!cfg.mov, dif=cfg.diff||2, TY=185, TX=W/2, FLY=.42; let R=96, lv=0;
  const rng=mulberry(seed||1), winds=[]; for(let i=0;i<N;i++)winds.push(wl?Math.round((rng()*2-1)*(wl===1?3:6)*(.7+.4*dif)*(1+.8*i/Math.max(1,N-1))*10)/10:0);
  const pal=hot?['#ffe9f1','#2a0a18','#a8305c','#ff4d8d','#ffd0e1']:['#ffffff','#3B1630','#6C7BD8','#E0457A','#FFC94D'];
  const bg=hot?['#1d0612','#5a1230']:['#BFE3FF','#FFF1F6'];
  let n=0, score=0, t=0, last=performance.now(), hold=0, holding=false, p0=null, a0=null, end=false, flash=0, msg='', marks=[], fly=null;
  let aim={x:TX,y:TY+22}, clearNext=false;
  const lvlUpdate=()=>{lv=N>1?Math.min(1,n/(N-1)):0;R=Math.max(30,Math.round(96*(1-(.2+.17*dif)*lv)))};
  const gust=()=>dif>=3&&wl?Math.sin(t*1.7)*1.6:0;
  const tcx=tt=>TX+(mov?Math.sin(tt*(.9+.5*lv+.25*dif))*(58+10*dif):0);
  const OFF=70, clampAim=(x,y)=>({x:Math.max(16,Math.min(W-16,x)),y:Math.max(56,Math.min(H-120,y))});
  /* il mirino segue il dito; solo in Pro c'è un leggero tremolio, che cresce se tieni troppo */
  const sway=()=>{const A=dif>=3?1.6+Math.max(0,hold-2.5)*3:0;return{x:Math.sin(t*1.6)*A,y:Math.cos(t*1.3)*A}};
  const pos=e=>{const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height}};
  cv.addEventListener('pointerdown',e=>{e.preventDefault();if(end||fly)return;try{cv.setPointerCapture(e.pointerId)}catch(x){}if(clearNext){marks=[];clearNext=false}holding=true;hold=0;const q=pos(e);aim=clampAim(q.x,q.y-OFF)});
  cv.addEventListener('pointermove',e=>{if(!holding)return;const p=pos(e);aim=clampAim(p.x,p.y-OFF)});
  cv.addEventListener('pointerup',e=>{
    if(!holding)return; holding=false;
    const s=sway(), w=(winds[n]||0)+(wl?gust():0), droop=0;
    const lx=aim.x+s.x+w*(7+3*lv), ly=aim.y+s.y+droop;
    fly={t:0,lx:lx,ly:ly,w:w}; hold=0;
  });
  cv.addEventListener('pointercancel',()=>{holding=false;hold=0});
  function land(){
    const cx=tcx(t), d=Math.hypot(fly.lx-cx,fly.ly-TY);
    const p=d>R?0:Math.max(1,10-Math.floor(d/(R/10)));
    marks.push({dx:fly.lx-cx,dy:fly.ly-TY,off:d>R,x:fly.lx,y:fly.ly});
    score+=p; n++; clearNext=true; lvlUpdate(); msg=p?'+'+p:'Fuori'; flash=55; fly=null; aim={x:TX,y:TY+22};
    try{navigator.vibrate&&navigator.vibrate(p>=9?[15,30,15]:12)}catch(e){}
    if(n>=N){end=true;setTimeout(()=>endPlay(score),1200)}
  }
  function arrowAt(x,y,ang,sc){
    ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    if(hot){ctx.font=(34*sc)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.rotate(Math.PI/4);ctx.fillText('🍆',0,0)}
    else{
      const L=54*sc; ctx.lineCap='round';
      ctx.strokeStyle='#7a5a4a';ctx.lineWidth=3*sc;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-L);ctx.stroke();
      ctx.fillStyle='#E0457A';ctx.beginPath();ctx.moveTo(0,-L-12*sc);ctx.lineTo(-5*sc,-L);ctx.lineTo(5*sc,-L);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff';ctx.strokeStyle='#E0457A';ctx.lineWidth=1.5*sc;
      for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(0,-2*sc);ctx.lineTo(s*8*sc,8*sc);ctx.lineTo(0,8*sc);ctx.closePath();ctx.fill();ctx.stroke()}
    }
    ctx.restore();
  }
  function stub(m,cx){
    const x=cx+m.dx,y=TY+m.dy;
    if(hot){ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍆',x,y)}
    else{ctx.beginPath();ctx.arc(x,y,3.5,0,7);ctx.fillStyle='#3B1630';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.strokeStyle='#E0457A';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6,y+12);ctx.stroke()}
  }
  function draw(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,bg[0]); g.addColorStop(1,bg[1]); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle=hot?'#3a0d22':'#9fd6a8'; ctx.beginPath(); ctx.ellipse(W/2,H+30,W*.9,150,0,0,7); ctx.fill();
    ctx.fillStyle=hot?'#2a0a18':'#86c592'; ctx.beginPath(); ctx.ellipse(W/2,TY+R+60,W*.62,26,0,0,7); ctx.fill();
    const cx=tcx(t);
    ctx.strokeStyle=hot?'#7a3a50':'#7a5a4a'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(cx-30,TY+R+52); ctx.lineTo(cx,TY+R*.55); ctx.lineTo(cx+30,TY+R+52); ctx.stroke();
    for(let i=10;i>=1;i--){ctx.beginPath();ctx.arc(cx,TY,R*i/10,0,7);ctx.fillStyle=pal[Math.floor((i-1)/2)];ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(0,0,0,.18)';ctx.stroke()}
    ctx.fillStyle='rgba(255,255,255,.7)'; heartPath(ctx,cx,TY-R*.06,R*.14); ctx.fill();
    marks.forEach(m=>stub(m,cx));
    /* vento */
    const w=(winds[Math.min(n,N-1)]||0)+(wl&&!end?gust():0);
    ctx.fillStyle=hot?'#fff':'#3B1630'; ctx.font='700 13px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    if(wl){
      const L=Math.abs(w)*9+8, dir=w>=0?1:-1, cx0=W/2, y0=66;
      ctx.textAlign='center'; ctx.fillText('Vento '+Math.abs(w).toFixed(1)+(w===0?'':dir>0?' →':' ←'),cx0,52);
      ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(cx0-dir*L/2,y0); ctx.lineTo(cx0+dir*L/2,y0); ctx.moveTo(cx0+dir*L/2,y0); ctx.lineTo(cx0+dir*(L/2-7),y0-5); ctx.moveTo(cx0+dir*L/2,y0); ctx.lineTo(cx0+dir*(L/2-7),y0+5); ctx.stroke();
      ctx.textAlign='left';
    }
    ctx.font='700 16px sans-serif'; ctx.fillText('Freccia '+Math.min(n+1,N)+' di '+N,14,28); ctx.textAlign='right'; ctx.fillText('Punti '+score,W-14,28);
    ctx.font='600 12px sans-serif'; ctx.textAlign='left'; ctx.fillText('Distanza '+(30+Math.round(lv*60))+' m',14,46); ctx.textAlign='right'; ctx.fillText(dif>=3?'Pro':dif===2?'Normale':'Facile',W-14,46);
    /* mirino */
    const s=sway(), cxh=aim.x+s.x, cyh=aim.y+s.y;
    if(!end&&!fly&&holding){
      ctx.strokeStyle=hot?'#ffd0e1':'#3B1630'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cxh,cyh,14,0,7); ctx.moveTo(cxh-22,cyh); ctx.lineTo(cxh+22,cyh); ctx.moveTo(cxh,cyh-22); ctx.lineTo(cxh,cyh+22); ctx.stroke();
    }
    /* solo la freccia, in basso: si inclina verso il mirino */
    const bx=W/2, by=H-46;
    if(!end&&!fly){
      const ang=holding?Math.atan2(aim.x-bx,by-aim.y)*.9:0;
      arrowAt(bx,by,ang,.95);
    }
    if(fly){
      const u=Math.min(1,fly.t/FLY), e=1-Math.pow(1-u,2), sx=bx, sy=by-20;
      const px=sx+(fly.lx-sx)*e, py=sy+(fly.ly-sy)*e-Math.sin(u*Math.PI)*30, sc=1-.68*e, ang=Math.atan2(fly.lx-sx,sy-fly.ly)*.9;
      arrowAt(px,py,ang,sc);
    }
    ctx.textAlign='center'; ctx.fillStyle=hot?'#fff':'#3B1630'; ctx.font='800 34px sans-serif';
    if(flash>0){ctx.globalAlpha=Math.min(1,flash/20);ctx.fillText(msg,W/2,TY+R+95);ctx.globalAlpha=1}
    ctx.font='600 13px sans-serif'; ctx.fillText(end?'Totale: '+score:(holding?'Rilascia per scoccare':'Tocca e trascina: il mirino segue il dito'),W/2,H-8);
  }
  function frame(now){
    if(!cv.isConnected)return;
    const dt=Math.min(.05,(now-last)/1000); last=now; t+=dt; if(flash>0)flash--; if(holding)hold+=dt;
    if(fly){fly.t+=dt;if(fly.t>=FLY)land()}
    draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Mini golf (campi casuali dallo stesso seme) ---------- */
function golfGen(seed,i,cfg){
  const R=mulberry((seed*31+i*977+7)|0), bump=!!cfg.bump, m=14;
  let W=320,H=440;
  if(cfg.size!=='s'){W=Math.round(320+R()*150);H=Math.round(440+R()*280)}
  const tee=[Math.round(m+30+R()*(W-2*m-60)),H-m-34], hole=[Math.round(m+30+R()*(W-2*m-60)),m+48];
  const walls=[], circs=[], dif=cfg.diff||2;
  const nW=Math.max(1,2+Math.floor(R()*3)+Math.floor(W*H/80000)+(dif-2)), nC=bump?Math.max(1,2+Math.floor(R()*3)+Math.floor(W*H/120000)+(dif-2)):0;
  const far=(x,y,rr)=>Math.hypot(x-tee[0],y-tee[1])>rr+58&&Math.hypot(x-hole[0],y-hole[1])>rr+58;
  const clearOf=(r)=>{
    const pad=34, e=[r[0]-pad,r[1]-pad,r[2]+2*pad,r[3]+2*pad];
    if(walls.some(w=>!(w[0]>e[0]+e[2]||w[0]+w[2]<e[0]||w[1]>e[1]+e[3]||w[1]+w[3]<e[1])))return false;
    if(circs.some(c=>c[0]+c[2]>e[0]&&c[0]-c[2]<e[0]+e[2]&&c[1]+c[2]>e[1]&&c[1]-c[2]<e[1]+e[3]))return false;
    return true;
  };
  for(let k=0;k<nW;k++)for(let t=0;t<60;t++){
    const hz=R()<.65, len=50+R()*((hz?W:H)*.32), w=Math.round(hz?len:14), h=Math.round(hz?14:len);
    const x=Math.round(m+R()*(W-2*m-w)), y=Math.round(m+75+R()*(H-2*m-150-h)), r=[x,y,w,h];
    const cx=x+w/2, cy=y+h/2, rad=Math.hypot(w,h)/2;
    if(far(cx,cy,rad)&&clearOf(r)){walls.push(r);break}
  }
  for(let k=0;k<nC;k++)for(let t=0;t<60;t++){
    const rr=13+Math.round(R()*8), x=Math.round(m+rr+R()*(W-2*m-2*rr)), y=Math.round(m+80+R()*(H-2*m-160));
    if(far(x,y,rr)&&clearOf([x-rr,y-rr,2*rr,2*rr])){circs.push([x,y,rr]);break}
  }
  const par=2+(H>560?1:0)+(walls.length+circs.length>=6?1:0);
  return {W:W,H:H,b:tee,h:hole,w:walls,c:circs,par:par};
}
function mountGolf(cv,th,cfg,seed){
  const hot=th==='hot', HN=cfg.holes||3, MAXS=10, hr=[15,12,10,8][(cfg.diff||2)-1]||12;
  const holes=[...Array(HN).keys()].map(i=>golfGen(seed||1,i,cfg));
  let ctx=null, W=320, H=440, r=7, hi=0, strokes=0, total=0, ball={x:0,y:0}, v={x:0,y:0}, moving=false, drag=null, msg='', done=false, lock=false, last=performance.now(), acc=0;
  const hole=()=>holes[hi];
  function setHole(){
    const h=hole(); W=h.W; H=h.H; r=W>400?8:7; ctx=fitCanvas(cv,W,H);
    ball={x:h.b[0],y:h.b[1]}; v={x:0,y:0}; moving=false; strokes=0; drag=null; lock=false;
  }
  setHole();
  const pos=e=>{const b=cv.getBoundingClientRect();return{x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height}};
  cv.addEventListener('pointerdown',e=>{e.preventDefault();if(moving||done||lock)return;try{cv.setPointerCapture(e.pointerId)}catch(x){}drag=pos(e)});
  cv.addEventListener('pointermove',e=>{if(drag)drag=pos(e)});
  const release=e=>{
    if(!drag)return; const d=pos(e), dx=ball.x-d.x, dy=ball.y-d.y, len=Math.hypot(dx,dy); drag=null;
    if(len<14)return;
    const pw=Math.min(len*.1,13); v={x:dx/len*pw,y:dy/len*pw}; moving=true; strokes++;
  };
  cv.addEventListener('pointerup',release); cv.addEventListener('pointercancel',()=>{drag=null});
  function nextHole(add,m){
    total+=add; msg=m; lock=true; trail=[]; const h0=hole();
    if(add<MAXS)for(let q=0;q<36;q++){const a=Math.random()*6.28,sp=1+Math.random()*3;conf.push({x:h0.h[0],y:h0.h[1],vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2.5,l:70,c:['#FF5C8A','#FFD04D','#8E5BDB','#35c27a','#fff'][q%5]})}
    setTimeout(()=>{ if(!cv.isConnected)return; hi++; if(hi>=holes.length){done=true;msg='Totale: '+total;setTimeout(()=>endPlay(total),900)}else{setHole();msg=''} },900);
  }
  function step(){
    ball.x+=v.x; ball.y+=v.y; v.x*=.987; v.y*=.987;
    const bounce=(nx,ny,k)=>{const dot=v.x*nx+v.y*ny;if(dot<0){v.x-=(k||1.8)*dot*nx;v.y-=(k||1.8)*dot*ny}};
    if(ball.x<10+r){ball.x=10+r;bounce(1,0)} if(ball.x>W-10-r){ball.x=W-10-r;bounce(-1,0)}
    if(ball.y<10+r){ball.y=10+r;bounce(0,1)} if(ball.y>H-10-r){ball.y=H-10-r;bounce(0,-1)}
    const h=hole();
    h.w.forEach(w=>{
      const cx=Math.max(w[0],Math.min(ball.x,w[0]+w[2])), cy=Math.max(w[1],Math.min(ball.y,w[1]+w[3]));
      let dx=ball.x-cx, dy=ball.y-cy, d=Math.hypot(dx,dy);
      if(d<r){if(d===0){dx=0;dy=-1;d=1}const nx=dx/d,ny=dy/d;ball.x=cx+nx*r;ball.y=cy+ny*r;bounce(nx,ny)}
    });
    h.c.forEach(c=>{
      const dx=ball.x-c[0], dy=ball.y-c[1], d=Math.hypot(dx,dy), rr=r+c[2];
      if(d<rr){const nx=dx/(d||1),ny=dy/(d||1);ball.x=c[0]+nx*rr;ball.y=c[1]+ny*rr;bounce(nx,ny,2);const sp=Math.hypot(v.x,v.y),ns=Math.min(14,Math.max(5,sp*1.18));if(sp>0){v.x*=ns/sp;v.y*=ns/sp}c[3]=8}
    });
    const sp=Math.hypot(v.x,v.y), hd=Math.hypot(ball.x-h.h[0],ball.y-h.h[1]);
    if(hd<hr&&sp<6){moving=false;v={x:0,y:0};ball.x=h.h[0];ball.y=h.h[1];nextHole(strokes,strokes===1?'Buca in uno!':'In buca! '+strokes+' colpi');return}
    if(sp<.15){moving=false;v={x:0,y:0};if(strokes>=MAXS)nextHole(MAXS,'Troppi colpi: '+MAXS)}
  }
  let T=0, trail=[], conf=[];
  const rrect=(x,y,w,h,q)=>{q=Math.min(q,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()};
  function draw(){
    const h=hole(), k=W/320, P=hot?{out:'#2a0a18',rim:'#7a2a4a',rim2:'#4a1230',g1:'#7a1f46',g2:'#8c2a56',wall:'#ff7aa8',wall2:'#c23a6e',bump:'#ff4d8d',txt:'#fff',tee:'rgba(255,255,255,.25)'}
      :{out:'#6fb97c',rim:'#b9835a',rim2:'#8a5a3c',g1:'#8fdc9d',g2:'#a8eab3',wall:'#d9a066',wall2:'#a8723f',bump:'#E0457A',txt:'#3B1630',tee:'rgba(255,255,255,.55)'};
    /* sfondo e bordo in legno */
    ctx.fillStyle=P.out; ctx.fillRect(0,0,W,H);
    rrect(2,3,W-4,H-4,22); ctx.fillStyle='rgba(0,0,0,.22)'; ctx.fill();
    rrect(2,1,W-4,H-4,22); const gb=ctx.createLinearGradient(0,0,0,H); gb.addColorStop(0,P.rim); gb.addColorStop(1,P.rim2); ctx.fillStyle=gb; ctx.fill();
    /* erba a strisce */
    ctx.save(); rrect(10,10,W-20,H-20,14); ctx.clip();
    ctx.fillStyle=P.g1; ctx.fillRect(10,10,W-20,H-20);
    ctx.fillStyle=P.g2; for(let y=10;y<H-10;y+=44)ctx.fillRect(10,y,W-20,22);
    const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75); vg.addColorStop(0,'rgba(255,255,255,.08)'); vg.addColorStop(1,'rgba(0,0,0,.18)'); ctx.fillStyle=vg; ctx.fillRect(10,10,W-20,H-20);
    /* partenza */
    rrect(h.b[0]-18,h.b[1]-14,36,28,8); ctx.fillStyle=P.tee; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=2; ctx.stroke();
    /* muretti 3D */
    h.w.forEach(w=>{
      rrect(w[0]+2,w[1]+4,w[2],w[3],5); ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fill();
      rrect(w[0],w[1],w[2],w[3],5); const g=ctx.createLinearGradient(0,w[1],0,w[1]+w[3]); g.addColorStop(0,P.wall); g.addColorStop(1,P.wall2); ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=1.5; ctx.stroke();
    });
    /* bumper */
    h.c.forEach(c=>{
      if(c[3]>0)c[3]--;
      const pulse=c[3]>0?4:0, rr=c[2]+pulse;
      ctx.beginPath();ctx.arc(c[0]+2,c[1]+4,rr,0,7);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill();
      const g=ctx.createRadialGradient(c[0]-rr*.3,c[1]-rr*.3,rr*.1,c[0],c[1],rr); g.addColorStop(0,'#ffd0e1'); g.addColorStop(.35,P.bump); g.addColorStop(1,hot?'#8a1740':'#a8305c');
      ctx.beginPath();ctx.arc(c[0],c[1],rr,0,7);ctx.fillStyle=g;ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();
      ctx.beginPath();ctx.arc(c[0],c[1],rr*.5,0,7);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.stroke();
      if(pulse){ctx.beginPath();ctx.arc(c[0],c[1],rr+6,0,7);ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.stroke()}
    });
    /* buca con ombra interna */
    const hg=ctx.createRadialGradient(h.h[0],h.h[1],2,h.h[0],h.h[1],hr+4); hg.addColorStop(0,'#000'); hg.addColorStop(.7,'#1d0a16'); hg.addColorStop(1,'rgba(29,10,22,.2)');
    ctx.beginPath(); ctx.arc(h.h[0],h.h[1],hr+3,0,7); ctx.fillStyle=hg; ctx.fill();
    ctx.beginPath(); ctx.arc(h.h[0],h.h[1],hr+3,0,7); ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=2; ctx.stroke();
    /* bandierina che sventola */
    const fx=h.h[0], fy=h.h[1], wv=Math.sin(T*4)*3;
    ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(fx,fy-2); ctx.lineTo(fx,fy-34); ctx.stroke();
    ctx.fillStyle='#FF5C8A'; ctx.beginPath(); ctx.moveTo(fx,fy-34); ctx.quadraticCurveTo(fx+10,fy-36+wv,fx+20,fy-30+wv*1.4); ctx.quadraticCurveTo(fx+10,fy-26+wv,fx,fy-22); ctx.closePath(); ctx.fill();
    ctx.restore();
    /* scia della pallina */
    trail.forEach((q,i)=>{ctx.beginPath();ctx.arc(q[0],q[1],r*(.25+.5*i/trail.length),0,7);ctx.fillStyle='rgba(255,255,255,'+(.08+.3*i/trail.length)+')';ctx.fill()});
    /* mira: freccia e potenza */
    if(drag&&!moving){
      const dx=ball.x-drag.x, dy=ball.y-drag.y, len=Math.hypot(dx,dy)||1, L=Math.min(len,130), ux=dx/len, uy=dy/len, pw=Math.min(1,len*.1/13);
      ctx.lineCap='round';
      for(let q=1;q<=7;q++){const d=q*L/7*1.0+r+4; if(d>L+r+4)break; ctx.beginPath();ctx.arc(ball.x+ux*d,ball.y+uy*d,3.2-q*.18,0,7);ctx.fillStyle='rgba(255,255,255,'+(.95-q*.09)+')';ctx.fill()}
      const ex=ball.x+ux*(L+r+10), ey=ball.y+uy*(L+r+10);
      ctx.fillStyle=pw>.85?'#ff5a3c':pw>.5?'#ffb020':'#35c27a'; ctx.beginPath(); ctx.moveTo(ex+ux*10,ey+uy*10); ctx.lineTo(ex-uy*7,ey+ux*7); ctx.lineTo(ex+uy*7,ey-ux*7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(ball.x,ball.y); ctx.lineTo(drag.x,drag.y); ctx.stroke();
      rrect(W/2-50,H-30*k-6,100,8,4); ctx.fillStyle='rgba(0,0,0,.25)'; ctx.fill();
      rrect(W/2-50,H-30*k-6,100*pw,8,4); ctx.fillStyle=pw>.85?'#ff5a3c':pw>.5?'#ffb020':'#35c27a'; ctx.fill();
    }
    /* pallina con ombra */
    ctx.beginPath(); ctx.ellipse(ball.x+2,ball.y+r*.8,r*.9,r*.5,0,0,7); ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fill();
    const bg=ctx.createRadialGradient(ball.x-r*.35,ball.y-r*.4,1,ball.x,ball.y,r); bg.addColorStop(0,'#fff'); bg.addColorStop(1,'#d9d2e0');
    ctx.beginPath(); ctx.arc(ball.x,ball.y,r,0,7); ctx.fillStyle=bg; ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1; ctx.stroke();
    /* coriandoli */
    conf.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.12;q.l--;ctx.fillStyle=q.c;ctx.fillRect(q.x,q.y,5,3)}); conf=conf.filter(q=>q.l>0);
    /* testi */
    ctx.fillStyle=P.txt; ctx.font='700 '+Math.round(15*k)+'px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    rrect(8,12,W-16,28*k,10); ctx.fillStyle=hot?'rgba(0,0,0,.35)':'rgba(255,255,255,.55)'; ctx.fill(); ctx.fillStyle=P.txt;
    ctx.fillText('Buca '+Math.min(hi+1,holes.length)+'/'+holes.length+' · Par '+h.par,18*k,32*k); ctx.textAlign='right'; ctx.fillText('Colpi '+strokes+' · Tot. '+total,W-18*k,32*k);
    ctx.textAlign='center'; ctx.font='800 '+Math.round(26*k)+'px sans-serif'; if(msg){ctx.lineWidth=5;ctx.strokeStyle=hot?'#2a0a18':'#fff';ctx.strokeText(msg,W/2,H/2);ctx.fillStyle=P.txt;ctx.fillText(msg,W/2,H/2)}
    ctx.fillStyle=P.txt; ctx.font='600 '+Math.round(13*k)+'px sans-serif'; if(!msg&&!moving&&strokes===0&&hi===0&&!drag)ctx.fillText('Trascina all\'indietro e rilascia per tirare',W/2,H-22*k);
  }
  cv.__g={holes:()=>holes,ball:()=>ball,st:()=>({hi:hi,moving:moving,done:done,total:total,strokes:strokes})};
  function frame(now){
    if(!cv.isConnected)return;
    acc+=Math.min(.1,(now-last)/1000); last=now;
    while(acc>=1/60){acc-=1/60;T+=1/60;if(moving){step();trail.push([ball.x,ball.y]);if(trail.length>14)trail.shift()}else if(trail.length)trail.shift()}
    draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}


/* ---------- Elenco partite ---------- */
function listHTML(){
  const gs=Object.values(DU.games()).filter(g=>ginfo(g.type)).sort((a,b)=>(b.at||0)-(a.at||0));
  if(!gs.length)return '';
  const m=me(), loc=S.mode==='local';
  const rows=gs.map(g=>{
    const i=ginfo(g.type), mine=!loc&&myTurn(g,m);
    const st=g.w?(g.w==='D'?'Pareggio':'Ha vinto '+nm(g.w)):loc?'In corso':mine?'Tocca a te':'Aspetta '+nm(other(m));
    return `<div class="gl ${mine?'mine':''}"><button class="glo" data-act="g-open" data-id="${esc(g.id)}"><span class="gico sm">${i.ico}</span><span class="glt"><b>${esc(i.t)}</b> <span class="note">· ${esc(TN[g.th]||'')}</span><br><span class="note ${mine?'mn':''}">${esc(st)}</span></span></button>
     ${S.gdel===g.id?`<button class="mini warn" data-act="g-del2" data-id="${esc(g.id)}">Sicuro?</button>`:`<button class="mini" data-act="g-del" data-id="${esc(g.id)}">Elimina</button>`}</div>`;
  }).join('');
  return `<section class="card"><h3 style="font-size:20px">Partite in corso</h3><p class="note" style="margin:2px 0 8px">Ogni mossa è salvata: potete uscire e tornare quando volete, e giocare più partite insieme.</p><div class="glist">${rows}</div></section>`;
}
function dailyHTML2(){
  const t=DU.todayStr(), games=DU.games();
  const rows=dailyChallenges(t).map(c=>{
    const g=games[c.gid], i=ginfo(c.id), mine=g&&S.mode!=='local'&&myTurn(g,me());
    return `<button class="glo dcg" data-act="g-daily" data-id="${c.id}"><span class="gico sm">${i.ico}</span><span class="glt"><b>${esc(i.t)}</b><br><span class="note">${esc(cfgText(c.id,c.cfg))}</span></span><span class="go2">${g?(g.w?'Finita':mine?'Tocca a te':'Continua'):'Sfida'}</span></button>`;
  }).join('');
  return `<section class="card"><h3 style="font-size:20px">Sfida del giorno</h3><p class="note" style="margin:2px 0 8px">Due giochi con regole scelte a caso, uguali per tutti e due. Cambiano ogni giorno.</p><div class="glist">${rows}</div></section>`;
}

/* ---------- Flappy cuore ---------- */
function mountFlap(cv,cfg,seed){
  const W=320,H=480, ctx=fitCanvas(cv,W,H), dif=Math.max(1,Math.min(4,+cfg.diff||2)), TRIES=+(cfg.tries||3);
  const GAP=[156,136,118,104][dif-1], SP=[2.1,2.5,2.9,3.4][dif-1], SPACE=[210,196,184,172][dif-1], PW=54, GR=H-56, X=88, G=.36, FL=-6.5, LO=64;
  let tries=0, best=0, run=null, over=false, last=performance.now(), acc=0, T=0, msg='', parts=[];
  function addPipe(){
    const prev=run.pipes.length?run.pipes[run.pipes.length-1]:null, hi=GR-LO-GAP;
    let gy=LO+run.rng()*(hi-LO); if(prev)gy=Math.max(LO,Math.min(hi,Math.max(prev.gy-110,Math.min(prev.gy+110,gy))));
    run.pipes.push({x:(prev?prev.x:W+10-SPACE)+SPACE,gy:gy,pass:false});
  }
  function newRun(){
    run={y:H*.42,v:0,pipes:[],score:0,state:'wait',rng:mulberry((seed||1)*13+7+tries*0)};
    for(let i=0;i<6;i++)addPipe(); msg=''; parts=[];
  }
  newRun();
  const flap=()=>{ if(over||run.state==='dead')return; if(run.state==='wait')run.state='play'; run.v=FL; try{navigator.vibrate&&navigator.vibrate(6)}catch(e){} };
  cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(x){}flap()});
  function die(){
    if(run.state==='dead')return;
    run.state='dead'; best=Math.max(best,run.score); tries++;
    for(let i=0;i<14;i++)parts.push({x:X,y:run.y,vx:(Math.random()-.5)*5,vy:(Math.random()-.8)*5,l:40});
    try{navigator.vibrate&&navigator.vibrate([20,40,20])}catch(e){}
    if(tries>=TRIES){over=true;msg='Migliore: '+best;setTimeout(()=>{if(cv.isConnected)endPlay(best)},1100)}
    else{msg='Ops! '+run.score+(run.score===1?' tubo':' tubi');setTimeout(()=>{if(cv.isConnected&&!over)newRun()},900)}
  }
  function step(){
    T++;
    parts.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.25;q.l--}); parts=parts.filter(q=>q.l>0);
    if(run.state==='wait'){run.y=H*.42+Math.sin(T/12)*7;return}
    if(run.state==='dead')return;
    run.v+=G; run.y+=run.v;
    run.pipes.forEach(p=>{p.x-=SP});
    if(run.pipes[0].x+PW<-10){run.pipes.shift();addPipe()}
    run.pipes.forEach(p=>{
      if(!p.pass&&p.x+PW<X-12){p.pass=true;run.score++}
      if(X+12>p.x&&X-12<p.x+PW&&(run.y-12<p.gy||run.y+12>p.gy+GAP))die();
    });
    if(run.state!=='dead'&&(run.y+12>GR||run.y-12<0))die();
  }
  function pipeDraw(x,y,h,flip){
    const g=ctx.createLinearGradient(x,0,x+PW,0); g.addColorStop(0,'#6d3fc9'); g.addColorStop(.5,'#9a6af0'); g.addColorStop(1,'#6d3fc9');
    ctx.fillStyle=g; ctx.fillRect(x,y,PW,h);
    const cy=flip?y+h-18:y; ctx.fillStyle='#b48cf7'; ctx.fillRect(x-4,cy,PW+8,18); ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=2; ctx.strokeRect(x-4,cy,PW+8,18);
  }
  function draw(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#7fd3ff'); g.addColorStop(1,'#ffe3ef'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.75)'; for(let i=0;i<4;i++){const cx=((i*110-T*.4*(1+i*.2))%(W+120)+W+120)%(W+120)-40, cy=70+i*74;ctx.beginPath();ctx.arc(cx,cy,18,0,7);ctx.arc(cx+20,cy+4,22,0,7);ctx.arc(cx+42,cy,16,0,7);ctx.fill()}
    run.pipes.forEach(p=>{pipeDraw(p.x,0,p.gy,true);pipeDraw(p.x,p.gy+GAP,GR-(p.gy+GAP),false)});
    ctx.fillStyle='#8be0a3'; ctx.fillRect(0,GR,W,H-GR); ctx.fillStyle='#5cc27c'; for(let x=-((T*SP)%24);x<W;x+=24)ctx.fillRect(x,GR,12,6);
    parts.forEach(q=>{ctx.fillStyle='rgba(224,69,122,'+(q.l/40)+')';heartPath(ctx,q.x,q.y,9);ctx.fill()});
    if(run.state!=='dead'){
      ctx.save(); ctx.translate(X,run.y); ctx.rotate(Math.max(-.5,Math.min(.9,run.v*.09)));
      ctx.fillStyle='#E0457A'; ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; heartPath(ctx,0,-14,30); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(-12,2,9,5,-.4+Math.sin(T/3)*.4,0,7); ctx.fill(); ctx.restore();
    }
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.strokeStyle='#3B1630'; ctx.lineWidth=5; ctx.font='800 44px sans-serif';
    ctx.strokeText(run.score,W/2,70); ctx.fillText(run.score,W/2,70);
    ctx.font='700 13px sans-serif'; ctx.lineWidth=3; const hud='Tentativo '+Math.min(tries+(run.state==='dead'?0:1),TRIES)+'/'+TRIES+' · migliore '+best;
    ctx.strokeText(hud,W/2,92); ctx.fillText(hud,W/2,92);
    if(run.state==='wait'&&!over){ctx.font='800 20px sans-serif';ctx.strokeText('Tocca per volare',W/2,H*.62);ctx.fillText('Tocca per volare',W/2,H*.62)}
    if(msg){ctx.font='800 26px sans-serif';ctx.lineWidth=5;ctx.strokeText(msg,W/2,H/2);ctx.fillText(msg,W/2,H/2)}
  }
  cv.__flap={state:()=>({y:run.y,v:run.v,s:run.state,score:run.score,over:over,pipes:run.pipes.map(p=>({x:p.x,gy:p.gy})),GAP:GAP,X:X})};
  function frame(now){
    if(!cv.isConnected)return;
    acc+=Math.min(.1,(now-last)/1000); last=now;
    while(acc>=1/60){acc-=1/60;step()}
    draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Cuore Dash ---------- */
function mountDash(cv,cfg,seed){
  const W=320,H=440, ctx=fitCanvas(cv,W,H), dif=Math.max(1,Math.min(4,+cfg.diff||2)), TRIES=+(cfg.tries||3);
  const SPD=[3.9,4.6,5.3,6.1][dif-1], GY=H-96, PX=76, S=28, G=.62, J=-11, JL=SPD*2*Math.abs(J)/G;
  let tries=0, best=0, run=null, over=false, last=performance.now(), acc=0, T=0, msg='', hold=false, buf=0, parts=[];
  function gen(){
    const r=run, rng=r.rng;
    while(r.next<r.dist+W+500){
      const x=r.next, roll=rng();
      let o;
      const pPit=dif>=3?.16:dif===2?.1:0, pBlk=.3, maxN=dif>=3?3:2;
      if(roll<pPit)o={t:'pit',x:x,w:Math.round(62+rng()*(dif>=4?34:24))};
      else if(roll<pPit+pBlk){const k=1+Math.floor(rng()*2), hh=rng()<.5?S:S*2;o={t:'blk',x:x,w:S*k,h:hh}}
      else o={t:'spk',x:x,w:S*(1+Math.floor(rng()*maxN)),n:0};
      if(o.t==='spk')o.n=o.w/S;
      r.obs.push(o);
      r.next=x+o.w+JL*(dif===1?1.25:dif===2?1.05:.95)+50+rng()*(dif===1?160:dif===2?120:90);
    }
  }
  function newRun(){
    run={dist:0,y:GY-S,v:0,on:true,rot:0,state:'wait',obs:[],next:520,rng:mulberry((seed||1)*17+3),speedUp:0}; gen(); msg=''; parts=[];
  }
  newRun();
  const press=()=>{ if(over)return; if(run.state==='wait')run.state='play'; buf=8; };
  cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId)}catch(x){}hold=true;press()});
  const rel=()=>{hold=false};
  cv.addEventListener('pointerup',rel); cv.addEventListener('pointercancel',rel);
  let why='';
  function die(w){
    if(run.state==='dead')return;
    why=w||''; run.state='dead'; const m=Math.floor(run.dist/18); best=Math.max(best,m); tries++;
    for(let i=0;i<16;i++)parts.push({x:PX,y:run.y+S/2,vx:(Math.random()-.5)*7,vy:(Math.random()-1)*7,l:45});
    try{navigator.vibrate&&navigator.vibrate([20,40,20])}catch(e){}
    if(tries>=TRIES){over=true;msg='Migliore: '+best+' m';setTimeout(()=>{if(cv.isConnected)endPlay(best)},1100)}
    else{msg=m+' m';setTimeout(()=>{if(cv.isConnected&&!over)newRun()},900)}
  }
  function step(){
    T++;
    parts.forEach(q=>{q.x+=q.vx;q.y+=q.vy;q.vy+=.35;q.l--}); parts=parts.filter(q=>q.l>0);
    if(run.state==='wait'){run.y=GY-S;return}
    if(run.state==='dead')return;
    const sp=SPD*(1+Math.min(.22,run.dist/70000)); run.dist+=sp; gen();
    run.obs=run.obs.filter(o=>o.x+o.w>run.dist-120);
    /* salto: tocco o dito tenuto premuto */
    if(buf>0)buf--; if(hold)buf=Math.max(buf,2);
    if(run.on&&buf>0){run.v=J;run.on=false;buf=0}
    run.v+=G; run.y+=run.v;
    const x0=run.dist+PX-S/2+3, x1=run.dist+PX+S/2-3, cxw=run.dist+PX;
    /* pavimento: terra, oppure la cima di un blocco; nelle buche non c'è */
    let floor=GY, pit=false;
    run.obs.forEach(o=>{
      if(o.t==='pit'&&cxw>o.x+4&&cxw<o.x+o.w-4)pit=true;
      if(o.t==='blk'&&x1>o.x&&x0<o.x+o.w){
        const top=GY-o.h, bot=run.y+S, prev=bot-run.v;
        if(prev<=top+10)floor=Math.min(floor,top); /* sopra il blocco: ci si appoggia */
        else if(bot>top+9)die('blocco'); /* urto di lato */
      }
      if(o.t==='spk'&&x1>o.x+5&&x0<o.x+o.w-5&&run.y+S>GY-20)die('spina');
    });
    if(run.state==='dead')return;
    if(pit&&floor===GY){run.on=false; if(run.y>H+40)die('buca'); return}
    if(run.y+S>=floor){run.y=floor-S;run.v=0;if(!run.on){run.on=true;run.rot=Math.round(run.rot/(Math.PI/2))*(Math.PI/2)}}
    else run.on=false;
    if(!run.on)run.rot+=.13;
  }
  function draw(){
    const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#2b1a5a'); g.addColorStop(1,'#a8316a'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.09)'; for(let i=0;i<7;i++){const x=((i*64-run.dist*.25)%(W+80)+W+80)%(W+80)-30;heartPath(ctx,x,70+(i%3)*80,36+(i%2)*14);ctx.fill()}
    const off=run.dist;
    /* terreno con buche */
    ctx.fillStyle='#1a0f3c'; ctx.fillRect(0,GY,W,H-GY);
    run.obs.forEach(o=>{if(o.t==='pit'){ctx.fillStyle=g;ctx.fillRect(o.x-off,GY,o.w,H-GY);ctx.fillStyle='#07030f';ctx.fillRect(o.x-off,GY+6,o.w,H-GY)}});
    ctx.fillStyle='#ff5c8a'; ctx.fillRect(0,GY,W,4); run.obs.forEach(o=>{if(o.t==='pit')ctx.clearRect(o.x-off,GY,o.w,4)});
    ctx.fillStyle='rgba(255,255,255,.06)'; for(let x=-((off)%32);x<W;x+=32)ctx.fillRect(x,GY+10,16,H-GY);
    run.obs.forEach(o=>{
      const x=o.x-off; if(x>W+40||x+o.w<-40)return;
      if(o.t==='spk'){ctx.fillStyle='#f6f0ff';ctx.strokeStyle='#e0457a';ctx.lineWidth=2;for(let k=0;k<o.n;k++){ctx.beginPath();ctx.moveTo(x+k*S,GY);ctx.lineTo(x+k*S+S/2,GY-S+2);ctx.lineTo(x+(k+1)*S,GY);ctx.closePath();ctx.fill();ctx.stroke()}}
      else if(o.t==='blk'){ctx.fillStyle='#6d3fc9';ctx.fillRect(x,GY-o.h,o.w,o.h);ctx.strokeStyle='#cbb2ff';ctx.lineWidth=2;ctx.strokeRect(x+1,GY-o.h+1,o.w-2,o.h-2);for(let k=0;k<o.h/S;k++)for(let j=0;j<o.w/S;j++){ctx.strokeRect(x+j*S+5,GY-o.h+k*S+5,S-10,S-10)}}
    });
    parts.forEach(q=>{ctx.fillStyle='rgba(255,92,138,'+(q.l/45)+')';ctx.fillRect(q.x,q.y,7,7)});
    if(run.state!=='dead'){
      ctx.save(); ctx.translate(PX,run.y+S/2); ctx.rotate(run.rot);
      ctx.shadowColor='#ff5c8a'; ctx.shadowBlur=14; ctx.fillStyle='#E0457A'; ctx.fillRect(-S/2,-S/2,S,S); ctx.shadowBlur=0;
      ctx.strokeStyle='#fff'; ctx.lineWidth=2.5; ctx.strokeRect(-S/2+1.5,-S/2+1.5,S-3,S-3);
      ctx.fillStyle='#fff'; ctx.fillRect(-7,-6,5,7); ctx.fillRect(3,-6,5,7); ctx.fillStyle='#3B1630'; ctx.fillRect(-5,-3,3,4); ctx.fillRect(5,-3,3,4); ctx.restore();
    }
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.strokeStyle='#3B1630'; ctx.lineWidth=4; ctx.font='800 34px sans-serif';
    const m=Math.floor(run.dist/18); ctx.strokeText(m+' m',W/2,54); ctx.fillText(m+' m',W/2,54);
    ctx.font='700 13px sans-serif'; ctx.lineWidth=3; const hud='Tentativo '+Math.min(tries+(run.state==='dead'?0:1),TRIES)+'/'+TRIES+' · migliore '+best+' m';
    ctx.strokeText(hud,W/2,76); ctx.fillText(hud,W/2,76);
    if(run.state==='wait'&&!over){ctx.font='800 20px sans-serif';ctx.strokeText('Tocca per partire',W/2,H*.4);ctx.fillText('Tocca per partire',W/2,H*.4)}
    if(msg){ctx.font='800 26px sans-serif';ctx.lineWidth=5;ctx.strokeText(msg,W/2,H*.36);ctx.fillText(msg,W/2,H*.36)}
  }
  cv.__dash={state:()=>({why:why,y:run.y,on:run.on,s:run.state,dist:run.dist,over:over,obs:run.obs.map(o=>({t:o.t,x:o.x,w:o.w,h:o.h})),PX:PX,JL:JL})};
  function frame(now){
    if(!cv.isConnected)return;
    acc+=Math.min(.1,(now-last)/1000); last=now;
    while(acc>=1/60){acc-=1/60;step()}
    draw(); requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- Viste ---------- */
function menuHTML(){
  const sc=S.scores||{A:0,B:0}, on=DU.hotOn();
  const lead=(x)=>x.A>x.B?`<b class="lA">${esc(nm('A'))}</b>`:x.B>x.A?`<b class="lB">${esc(nm('B'))}</b>`:'<b>pari</b>';
  const gs=sc.g||{}, tot={A:sc.A||0,B:sc.B||0}, open=!!S.sbOpen;
  const rbtn=id=>S.rstc===id?`<button class="mini warn" data-act="g-rst2" data-g="${id}">Sicuro?</button>`:`<button class="mini" data-act="g-rst" data-g="${id}">Azzera</button>`;
  const rows=GAMES.map(g=>{const x=Object.assign({A:0,B:0,D:0},gs[g.id]), pl=x.A+x.B+x.D;return `<tr><td>${esc(g.t)}${pl?`<small>${x.A===x.B?'sono pari':'vince di più '+lead(x)}</small>`:''}</td><td class="n">${x.A}</td><td class="n">${x.B}</td><td class="n">${x.D}</td><td class="r">${pl?rbtn(g.id):''}</td></tr>`}).join('');
  const board=`<section class="card score"><button class="sbh" data-act="g-sb" aria-expanded="${open}"><span><b>Classifica</b><br><span class="note">${tot.A+tot.B===0?'nessuna vittoria ancora':'in testa: '+lead(tot)+' · '+tot.A+' a '+tot.B}</span></span><span class="chev">${open?'▲':'▼'}</span></button>
   ${open?`<table class="sb"><thead><tr><th>Gioco</th><th class="n"><i class="dot"></i>${esc(nm('A'))}</th><th class="n"><i class="dot B"></i>${esc(nm('B'))}</th><th class="n">Pari</th><th></th></tr></thead><tbody>${rows}<tr class="tt"><td>Totale<small>${tot.A===tot.B?'sono pari':'vince di più '+lead(tot)}</small></td><td class="n">${tot.A}</td><td class="n">${tot.B}</td><td class="n">${sc.D||0}</td><td class="r">${tot.A+tot.B+(sc.D||0)?rbtn('all'):''}</td></tr></tbody></table>`:''}</section>`;
  const cards=GAMES.map(g=>{
    const btns=`<button class="btn sm" data-act="g-new" data-g="${g.id}" data-th="rom">${hs('hk')}Gioca</button>`+
      (g.id==='ic'?'<button class="btn sm ghost" data-act="g-new" data-g="ic" data-th="ric">Ricordi nostri</button>':'')+
      (OPTS[g.id]?`<button class="btn sm ghost" data-act="g-rand" data-g="${g.id}" aria-label="Partita a sorpresa">🎲 A sorpresa</button>`:'');
    return `<article class="card gcard" style="--g1:${g.gr.split(',')[0]};--g2:${g.gr.split(',')[1]}"><div class="gh"><span class="gico">${g.ico}</span><div><h3>${esc(g.t)}</h3><p class="sub">${esc(g.b)}</p></div></div><div class="actions" style="margin-top:2px">${btns}</div></article>`;
  }).join('');
  return `<div class="top"><h2 class="h2">Giochi</h2><span class="chip"><i class="dot"></i>${sc.A||0} · <i class="dot B"></i>${sc.B||0}</span></div>
   ${listHTML()}${dailyHTML2()}${board}<p class="note" style="margin-top:-8px">Sfidatevi: chi vince sceglie il pegno. Potete giocare più partite insieme: ogni mossa resta salvata. "A sorpresa" sceglie le regole a caso.</p>${cards}`;
}
function setupHTML(){
  const s=S.gset, info=ginfo(s.g), hot=s.th==='hot';
  const rows=OPTS[s.g].map(o=>`<div class="optrow"><p class="eyebrow">${esc(o.t)}</p><div class="chips">${o.v.map((x,i)=>`<button class="chip ${s.cfg[o.k]===x[0]?'on':''}" data-act="g-opt" data-k="${o.k}" data-i="${i}">${esc(x[1])}</button>`).join('')}</div>${o.h?`<p class="note">${esc(o.h)}</p>`:''}</div>`).join('');
  const hn=hot&&s.g==='bs'?'Nella versione hot le navi diventano 🍆 e 🍑 e i colpi 💦.':hot&&s.g==='arch'?'Nella versione hot la freccia è un 🍆.':'';
  return `<div class="top"><h2 class="h2">${esc(info.t)}</h2><span class="chip">${esc(TN[s.th]||'')}</span></div>
   <section class="card gset">${rows}${hn?`<p class="note">${hn}</p>`:''}<div class="actions"><button class="btn" data-act="g-start">Inizia la partita</button><button class="btn ghost" data-act="g-setback">Indietro</button></div></section>`;
}
function gateHTML(g){
  return `<section class="card" style="text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center">
   <p class="eyebrow">Informazioni nascoste</p><h3 style="font-size:24px">Passa il telefono a ${esc(nm(g.turn))}</h3>
   <button class="btn" data-act="g-gate">Sono ${esc(nm(g.turn))}</button><button class="link" data-act="g-back">Indietro</button></section>`;
}
function playHTML(){
  const p=S.play, tt=({arch:'Tiro con l\'arco',golf:'Mini golf',flap:'Flappy cuore',dash:'Cuore Dash'})[p.g]||'Gioco';
  return `<div class="top"><h2 class="h2">${tt}</h2><span class="chip"><i class="dot ${p.slot}"></i>${esc(nm(p.slot))}</span></div>
   <div class="cvw"><canvas id="cv" width="320" height="${(p.g==='arch'||p.g==='flap')?480:440}" aria-label="${tt}"></canvas></div>
   <div class="actions" style="justify-content:center"><button class="btn ghost" data-act="g-stop">Interrompi</button></div>`;
}
function render(){
  bsRetry();
  if(S.gset)return setupHTML();
  if(S.play)return playHTML();
  const g=S.game; if(!g)return menuHTML();
  const info=ginfo(g.type);
  if(!info){return menuHTML()}
  if(info.hidden&&!g.w&&S.mode==='local'&&g.turn!==me())return gateHTML(g);
  let body;
  const cf=g.cfg||{};
  if(g.type==='c4')body=c4html(g);
  else if(g.type==='q20')body=q20HTML(g);
  else if(g.type==='tris')body=ttHTML(g);
  else if(g.type==='mem')body=memHTML(g);
  else if(g.type==='bs')body=bsHTML(g);
  else if(g.type==='ic')body=icHTML(g);
  else if(g.type==='arch')body=scoreHTML(g,'punti',`${cf.n||5} frecce a testa${cf.wind?', con vento':''}${cf.mov?' e bersaglio mobile':''}. Tocca e trascina: il mirino segue il dito (sta un po' sopra, così lo vedi). Rilascia per tirare. Il vento sposta la freccia: compensa. Lo stesso vento per tutti e due.`);
  else if(g.type==='flap')body=scoreHTML(g,'tubi',`Tocca per battere le ali e passa tra i tubi. ${cf.tries||3} ${(+cf.tries||3)===1?'tentativo':'tentativi'} a testa: conta il migliore. Gli stessi tubi per tutti e due: vince chi ne supera di più.`);
  else if(g.type==='dash')body=scoreHTML(g,'m',`Il cuore corre da solo: tocca per saltare (tieni premuto per saltare di nuovo). ${cf.tries||3} ${(+cf.tries||3)===1?'tentativo':'tentativi'} a testa: conta il migliore. Lo stesso percorso per tutti e due: vince chi va più lontano.`);
  else body=scoreHTML(g,'colpi',`${cf.holes||3} buche${cf.bump?' con bumper':''}, stesso percorso per tutti e due. Trascina all'indietro dalla pallina e rilascia: vince chi tira meno.`);
  return `<div class="top"><button class="btn ghost sm" data-act="g-back" aria-label="Torna alle partite">← Indietro</button><span class="chip">${esc(info.t)} · ${esc(TN[g.th]||'')}</span></div>${body}`;
}
function click(act,t){
  if(act==='g-new'){openSetup(t.dataset.g,t.dataset.th);return true}
  if(act==='g-opt'){const o=OPTS[S.gset.g].find(x=>x.k===t.dataset.k);if(o){S.gset.cfg[o.k]=o.v[+t.dataset.i][0]}DU.render(true);return true}
  if(act==='g-start'){const s=S.gset;if(s)startGame(s.g,s.th,s.cfg);return true}
  if(act==='g-setback'){S.gset=null;DU.render(true);return true}
  if(act==='g-back'){S.gset=null;S.play=null;S.freeze=false;S.pend=null;DU.openGame(null);return true}
  if(act==='g-close'||act==='g-quit'){S.gset=null;S.play=null;S.freeze=false;S.bsp=null;S.bsel=null;S.pend=null;DU.clearGame();return true}
  if(act==='g-open'){S.gdel=null;S.pend=null;DU.openGame(t.dataset.id);return true}
  if(act==='g-del'){S.gdel=t.dataset.id;DU.render(true);return true}
  if(act==='g-del2'){S.gdel=null;DU.clearGame(t.dataset.id);return true}
  if(act==='g-daily'){startDaily(DU.todayStr(),t.dataset.id);return true}
  if(act==='g-rand'){const id=t.dataset.g,cfg=randCfg(id);DU.toast('Regole a sorpresa: '+cfgText(id,cfg));startGame(id,'rom',cfg);return true}
  if(act==='g-again'){const g=S.game;if(g){const ty=g.type,th=g.th,cf=g.cfg;DU.clearGame();openSetup(ty,th,cf)}return true}
  if(act==='g-q20set'){q20Set();return true}
  if(act==='g-q20ask'){q20Ask(false);return true}
  if(act==='g-q20guess'){q20Ask(true);return true}
  if(act==='g-q20ans'){q20Ans(t.dataset.a);return true}
  if(act==='g-tt'){const g=S.game;if(g&&!g.w&&actorOK(g))setPend(g,+t.dataset.i);return true}
  if(act==='g-send'){sendMove();return true}
  if(act==='g-mem'){memTap(+t.dataset.i);return true}
  if(act==='g-memnext'){memNext();return true}
  if(act==='g-c4'){const g=S.game;if(g&&!g.w&&actorOK(g)){const d=c4dims(g);if(g.b[+t.dataset.c])DU.toast('Colonna piena');else setPend(g,+t.dataset.c)}return true}
  if(act==='g-c4pop'){const g=S.game;if(g&&!g.w&&actorOK(g))setPend(g,'p'+t.dataset.c);return true}
  if(act==='g-sb'){S.sbOpen=!S.sbOpen;S.rstc=null;DU.render(true);return true}
  if(act==='g-rst'){S.rstc=t.dataset.g;DU.render(true);return true}
  if(act==='g-rst2'){DU.resetScores(t.dataset.g==='all'?null:t.dataset.g);S.rstc=null;return true}
  if(act==='g-bsplace'){bsPlace(+t.dataset.i);return true}
  if(act==='g-bsrot'){const g=S.game;if(g){const st=bsPState(g);st.h=!st.h;DU.rq()}return true}
  if(act==='g-bsrand'){const g=S.game;if(g){const st=bsPState(g);st.ships=bsRandom(g);st.hold=null;st.holdOld=null;DU.rq()}return true}
  if(act==='g-bsclr'){const g=S.game;if(g){const st=bsPState(g);st.ships=[];st.hold=null;st.holdOld=null;DU.rq()}return true}
  if(act==='g-bsundo'){const g=S.game;if(g){const st=bsPState(g);if(st.holdOld)st.ships.push(st.holdOld);st.hold=null;st.holdOld=null;DU.rq()}return true}
  if(act==='g-bsready'){bsReady();return true}
  if(act==='g-bs'){const g=S.game;if(g&&!g.w&&actorOK(g)){S.bsel=+t.dataset.i;DU.rq()}return true}
  if(act==='g-bsfire'){bsFire();return true}
  if(act==='g-icpick'){icPick(+t.dataset.i);return true}
  if(act==='g-icq'){icAsk(t.dataset.tag,t.dataset.q);return true}
  if(act==='g-icg'){icGuess(+t.dataset.i);return true}
  if(act==='g-icmode'){S.icGuess=!S.icGuess;DU.rq();return true}
  if(act==='g-icel'){
    const g=S.game; if(!g)return true; const m=S.mode==='local'?g.turn:me(), i=+t.dataset.i;
    const a=S.icElim[m]; const k=a.indexOf(i); if(k<0)a.push(i); else a.splice(k,1); DU.rq(); return true;
  }
  if(act==='g-gate'){DU.setActive(S.game.turn);return true}
  if(act==='g-play'){
    const g=S.game; if(!g)return true;
    S.play={g:g.type,th:g.th,slot:t.dataset.s,id:g.id}; S.freeze=true; DU.render(true); return true;
  }
  if(act==='g-stop'){S.play=null;S.freeze=false;DU.rq();return true}
  if(act==='g-tl'){
    const g=S.game; if(!g)return true;
    const info=ginfo(g.type);
    const title=info.t+': '+(g.w==='D'?'pareggio':'ha vinto '+nm(g.w));
    DU.addEvent({title:title,text:'Pegno: '+(g.peg||''),hot:g.th==='hot'});
    DU.mergeGame(n=>{if(n)n.saved=true;return n});
    DU.toast('Salvato nella timeline'); return true;
  }
  return false;
}
function mount(){
  const cv=document.getElementById('cv'); if(!cv||!S.play||!S.game)return;
  const cf=S.game.cfg||{}, sd=S.game.seed||1;
  const pg=S.play.g; if(pg==='arch')mountArch(cv,S.play.th,cf,sd); else if(pg==='flap')mountFlap(cv,cf,sd); else if(pg==='dash')mountDash(cv,cf,sd); else mountGolf(cv,S.play.th,cf,sd);
}
return {render:render,click:click,mount:mount,myTurn:myTurn,dailyChallenges:dailyChallenges,cfgText:cfgText,ginfo:ginfo};
};
})();
