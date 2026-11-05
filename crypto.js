/* Cuoricino: cifratura da telefono a telefono (AES-256-GCM, WebCrypto del browser).
   - La chiave nasce sul telefono, non va mai al server e si passa a mano al partner.
   - Quasi ogni valore di ogni documento è cifrato, e ognuno è legato al suo documento e al suo campo
     (spostarlo o scambiarlo con un altro non funziona). In chiaro restano solo le etichette tecniche (percorsi, nomi dei campi, date di
     scrittura), la scelta dei posti A/B e la prova della chiave.
   - La chiave sul telefono può essere protetta da un PIN (PBKDF2-SHA256, 600.000 giri) e il telefono si blocca da solo.
   - La chiave si può cambiare: tutto viene ricifrato.
   Formati: f1: testo · f2: foto jpeg · f3: qualunque valore (JSON) · e1/e2/e3: formato vecchio, ancora leggibile. */
(function(){
'use strict';
const STORE='cuoricino-e2e', WRAP='cuoricino-e2e-w', OLD='cuoricino-e2e-old', ITER=600000, B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let key=null, raw=null, oldKey=null, oldRaw=null, wk=null, salt=null, frozen=false;
const enc=new TextEncoder(), dec=new TextDecoder();
const cs=()=>window.crypto&&window.crypto.subtle;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};

/* --- conversioni --- */
function toB64(u8){let s='',i=0;for(;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)}
function fromB64(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}
function b32enc(u8){let bits='';u8.forEach(b=>{bits+=b.toString(2).padStart(8,'0')});let o='';for(let i=0;i<bits.length;i+=5)o+=B32[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return o}
function b32dec(s){
  s=String(s||'').toUpperCase().replace(/O/g,'0').replace(/[IL]/g,'1').replace(/[^0-9A-Z]/g,'');
  if(s.length!==52)return null;
  let bits='';for(const c of s){const v=B32.indexOf(c);if(v<0)return null;bits+=v.toString(2).padStart(5,'0')}
  const u=new Uint8Array(32);for(let i=0;i<32;i++)u[i]=parseInt(bits.slice(i*8,i*8+8),2);return u;
}
const fmt=s=>s.match(/.{1,4}/g).join('-');
const isEnc=v=>typeof v==='string'&&/^[ef][123]:/.test(v);
const isLegacy=v=>typeof v==='string'&&/^e[123]:/.test(v);
async function importRaw(u8){return cs().importKey('raw',u8,'AES-GCM',false,['encrypt','decrypt'])}

/* --- stato della chiave: in chiaro nel browser, oppure protetta da PIN --- */
const hasWrap=()=>!!ls.get(WRAP);
const isLocked=()=>hasWrap()&&!key;
async function load(){
  if(hasWrap())return 'locked';
  const s=ls.get(STORE); if(!s)return false;
  try{
    const u=b32dec(s); if(!u)return false; key=await importRaw(u); raw=b32enc(u);
    const o=ls.get(OLD); if(o){const ou=b32dec(o); if(ou){oldKey=await importRaw(ou);oldRaw=b32enc(ou)}}
    return true;
  }catch(e){return false}
}
async function setKey(str){
  const u=b32dec(str); if(!u)return false;
  key=await importRaw(u); raw=b32enc(u);
  if(hasWrap())await persist(); else ls.set(STORE,raw);
  return true;
}
async function generate(){const u=new Uint8Array(32);crypto.getRandomValues(u);return setKey(b32enc(u))}
const has=()=>!!key;
const keyString=()=>raw?fmt(raw):'';
function wipeMemory(){key=null;raw=null;oldKey=null;oldRaw=null;wk=null;salt=null}
function clear(){wipeMemory();ls.del(STORE);ls.del(WRAP);ls.del(OLD)}

/* --- PIN --- */
async function deriveWrap(pin,sa){
  const base=await cs().importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveKey']);
  return cs().deriveKey({name:'PBKDF2',salt:sa,iterations:ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function persist(){ /* riscrive la chiave (e quella vecchia, durante un cambio) protette dal PIN */
  if(!wk||!salt||!raw)return;
  const iv=new Uint8Array(12);crypto.getRandomValues(iv);
  const body=enc.encode(JSON.stringify({k:raw,o:oldRaw||null}));
  const ct=new Uint8Array(await cs().encrypt({name:'AES-GCM',iv:iv,additionalData:enc.encode('cuoricino-wrap')},wk,body));
  const chk=await encBytes(enc.encode(CHECK),'local-chk');
  ls.set(WRAP,JSON.stringify({s:toB64(salt),i:toB64(iv),c:toB64(ct),chk:chk,n:ITER}));
}
async function protect(pin){ /* imposta (o cambia) il PIN: da ora la chiave non sta più in chiaro */
  if(!key||!raw)return false;
  salt=new Uint8Array(16);crypto.getRandomValues(salt); wk=await deriveWrap(pin,salt);
  await persist(); ls.del(STORE); ls.del(OLD); return true;
}
async function unlock(pin){
  const w=ls.get(WRAP); if(!w)return false;
  try{
    const j=JSON.parse(w), sa=fromB64(j.s); const k2=await deriveWrap(pin,sa);
    const body=JSON.parse(dec.decode(new Uint8Array(await cs().decrypt({name:'AES-GCM',iv:fromB64(j.i),additionalData:enc.encode('cuoricino-wrap')},k2,fromB64(j.c)))));
    const u=b32dec(body.k); if(!u)return false;
    key=await importRaw(u); raw=b32enc(u); wk=k2; salt=sa;
    if(body.o){const ou=b32dec(body.o); if(ou){oldKey=await importRaw(ou);oldRaw=b32enc(ou)}}
    return true;
  }catch(e){return false}
}
async function removePin(){ /* torna alla chiave in chiaro: richiede di essere sbloccati */
  if(!key||!raw)return false; ls.set(STORE,raw); if(oldRaw)ls.set(OLD,oldRaw); ls.del(WRAP); wk=null; salt=null; return true;
}
/* PIN dimenticato: la chiave di cifratura (quella lunga) permette di impostarne uno nuovo */
async function resetPin(keyStr,newPin){
  const w=ls.get(WRAP); if(!w)return false; const u=b32dec(keyStr); if(!u)return false;
  try{
    const j=JSON.parse(w), k=await importRaw(u);
    const ok=dec.decode(await decBytes(j.chk,'local-chk',k))===CHECK; if(!ok)return false;
    key=k; raw=b32enc(u); oldKey=null; oldRaw=null; return protect(newPin);
  }catch(e){return false}
}
function lock(){ /* toglie la chiave dalla memoria: serve un PIN per riaprire */
  if(!hasWrap())return false; wipeMemory(); return true;
}

/* --- cifratura di un valore --- */
async function encBytes(u8,aad,k){
  const iv=new Uint8Array(12);crypto.getRandomValues(iv);
  const ct=new Uint8Array(await cs().encrypt({name:'AES-GCM',iv:iv,additionalData:enc.encode(aad)},k||key,u8));
  const out=new Uint8Array(12+ct.length);out.set(iv,0);out.set(ct,12);return toB64(out);
}
async function decBytes(b64,aad,k){
  const u=fromB64(b64);
  return new Uint8Array(await cs().decrypt({name:'AES-GCM',iv:u.subarray(0,12),additionalData:enc.encode(aad)},k||key,u.subarray(12)));
}
const IMG=/^data:image\/jpeg;base64,/;
async function encVal(v,aad){
  if(v===null||v===undefined||isEnc(v))return v;
  if(typeof v!=='string')return 'f3:'+await encBytes(enc.encode(JSON.stringify(v)),aad);
  if(IMG.test(v))return 'f2:'+await encBytes(fromB64(v.replace(IMG,'')),aad);
  return 'f1:'+await encBytes(enc.encode(v),aad);
}
async function decWith(v,aad,k){
  const t=v.slice(0,3), b=v.slice(3), u=await decBytes(b,aad,k);
  if(t==='f1:'||t==='e1:')return dec.decode(u);
  if(t==='f2:'||t==='e2:')return 'data:image/jpeg;base64,'+toB64(u);
  return JSON.parse(dec.decode(u));
}
async function decVal(v,path,field){
  if(!isEnc(v)||!key)return v;
  const aad=v[0]==='e'?path:path+'#'+field;   /* il vecchio formato era legato solo al documento */
  try{return await decWith(v,aad,key)}catch(e){}
  if(oldKey){try{return await decWith(v,aad,oldKey)}catch(e){}}
  return v;
}

/* --- quali documenti e quali campi --- */
const plainPath=p=>p.split('/')[0]==='slots'||p==='couple/keycheck'||p==='couple/rotating';
async function mapDoc(path,data,fn){
  if(!data||typeof data!=='object'||Array.isArray(data)||plainPath(path))return data;
  const d=Object.assign({},data);
  for(const f of Object.keys(d)){if(d[f]!==null&&d[f]!==undefined)d[f]=await fn(d[f],f)}
  return d;
}
async function encDoc(path,data){
  if(frozen)throw new Error('cifratura in aggiornamento');
  if(!key)return data;
  return mapDoc(path,data,(v,f)=>encVal(v,path+'#'+f));
}
async function decDoc(path,data){if(!key)return data;return mapDoc(path,data,(v,f)=>decVal(v,path,f))}
/* c'è ancora qualcosa in chiaro, o nel formato vecchio, da (ri)cifrare? */
async function needsEnc(path,data){
  if(!data||typeof data!=='object'||Array.isArray(data)||plainPath(path))return false;
  return Object.keys(data).some(f=>data[f]!==null&&data[f]!==undefined&&!(typeof data[f]==='string'&&/^f[123]:/.test(data[f])));
}
/* tutto ciò che è cifrato si apre con la chiave attuale? (verifica dopo un cambio chiave) */
async function allOpen(path,data){
  if(!data||typeof data!=='object'||Array.isArray(data)||plainPath(path))return true;
  for(const f of Object.keys(data)){
    const v=data[f]; if(!isEnc(v))continue;
    try{await decWith(v,v[0]==='e'?path:path+'#'+f,key)}catch(e){return false}
  }
  return true;
}

/* --- prova della chiave: un valore noto, cifrato, salvato sul server --- */
const CHECK='cuoricino-ok';
async function makeCheck(){return encVal(CHECK,'couple/keycheck#v')}
async function tryKey(str,check){
  const u=b32dec(str); if(!u||!isEnc(check))return false;
  try{const k=await importRaw(u);return dec.decode(await decBytes(check.slice(3),check[0]==='e'?'couple/keycheck':'couple/keycheck#v',k))===CHECK}catch(e){return false}
}
async function verify(check){
  if(!key||!isEnc(check))return false;
  const aad=check[0]==='e'?'couple/keycheck':'couple/keycheck#v';
  for(const k of [key,oldKey]){ /* durante un cambio chiave la prova può essere ancora quella vecchia */
    if(!k)continue;
    try{if(dec.decode(await decBytes(check.slice(3),aad,k))===CHECK)return true}catch(e){}
  }
  return false;
}

/* --- cambio chiave: la nuova entra in uso, la vecchia resta solo per leggere finché tutto è ricifrato --- */
async function beginRotation(){
  if(!key||!raw)return false;
  oldKey=key; oldRaw=raw; const u=new Uint8Array(32);crypto.getRandomValues(u); key=await importRaw(u); raw=b32enc(u);
  if(hasWrap())await persist(); else{ls.set(STORE,raw);ls.set(OLD,oldRaw)}
  return true;
}
async function endRotation(){oldKey=null;oldRaw=null;ls.del(OLD); if(hasWrap())await persist()}
async function reencrypt(path,data){ /* apre con la chiave vecchia o nuova e ricifra con la nuova, campo per campo */
  if(!data||typeof data!=='object'||Array.isArray(data)||plainPath(path))return data;
  const plain=await decDoc(path,data); return mapDoc(path,plain,(v,f)=>encVal(v,path+'#'+f));
}
const freeze=on=>{frozen=!!on};

window.DUCrypto={load:load,setKey:setKey,generate:generate,has:has,keyString:keyString,clear:clear,encDoc:encDoc,decDoc:decDoc,needsEnc:needsEnc,allOpen:allOpen,
  makeCheck:makeCheck,tryKey:tryKey,verify:verify,isEnc:isEnc,isLegacy:isLegacy,supported:()=>!!cs(),
  isLocked:isLocked,hasPin:hasWrap,protect:protect,unlock:unlock,removePin:removePin,resetPin:resetPin,lock:lock,
  beginRotation:beginRotation,endRotation:endRotation,rotating:()=>!!oldKey,reencrypt:reencrypt,freeze:freeze,ITER:ITER};
})();
