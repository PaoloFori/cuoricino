/* Cuoricino: cifratura da telefono a telefono (AES-256-GCM, WebCrypto del browser).
   La chiave nasce sul telefono, non va mai al server e si passa a mano al partner. Sul server finiscono solo dati cifrati:
   foto, testi, risposte, messaggi, note, posizione. Restano in chiaro solo le "etichette" tecniche (a chi appartiene un dato,
   quando, il numero della domanda) e i nomi. Formati:
     e1:  testo            e2:  foto (jpeg)            e3:  qualunque valore (JSON) */
(function(){
'use strict';
const STORE='cuoricino-e2e', B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let key=null, raw=null;
const enc=new TextEncoder(), dec=new TextDecoder();
const cs=()=>window.crypto&&window.crypto.subtle;

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
const isEnc=v=>typeof v==='string'&&/^e[123]:/.test(v);

/* --- chiave --- */
async function importRaw(u8){return cs().importKey('raw',u8,'AES-GCM',false,['encrypt','decrypt'])}
async function load(){
  try{const s=localStorage.getItem(STORE);if(!s)return false;const u=b32dec(s);if(!u)return false;key=await importRaw(u);raw=b32enc(u);return true}catch(e){return false}
}
async function setKey(str){
  const u=b32dec(str); if(!u)return false;
  key=await importRaw(u); raw=b32enc(u);
  try{localStorage.setItem(STORE,raw)}catch(e){}
  return true;
}
async function generate(){const u=new Uint8Array(32);crypto.getRandomValues(u);return setKey(b32enc(u))}
const has=()=>!!key;
const keyString=()=>raw?fmt(raw):'';
function clear(){key=null;raw=null;try{localStorage.removeItem(STORE)}catch(e){}}

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
async function encVal(v,aad,mode){
  if(v===null||v===undefined||isEnc(v))return v;
  if(mode==='any')return 'e3:'+await encBytes(enc.encode(JSON.stringify(v)),aad);
  if(typeof v!=='string')return v;
  if(IMG.test(v))return 'e2:'+await encBytes(fromB64(v.replace(IMG,'')),aad);
  return 'e1:'+await encBytes(enc.encode(v),aad);
}
async function decVal(v,aad){
  if(!isEnc(v))return v;
  if(!key)return v;
  try{
    const t=v.slice(0,3), b=v.slice(3), u=await decBytes(b,aad);
    if(t==='e1:')return dec.decode(u);
    if(t==='e2:')return 'data:image/jpeg;base64,'+toB64(u);
    return JSON.parse(dec.decode(u));
  }catch(e){return v}
}

/* --- quali campi di quale documento --- */
const KIND=p=>p.split('/')[0];
async function mapDoc(path,data,fn,mode){
  if(!data||typeof data!=='object')return data;
  const k=KIND(path), d=Object.assign({},data);
  const one=async f=>{if(f in d)d[f]=await fn(d[f],path)};
  const arr=async f=>{if(Array.isArray(d[f]))d[f]=await Promise.all(d[f].map(x=>fn(x,path)))};
  if(k==='photofull'){await one('img')}
  else if(k==='photos'){await one('th')}
  else if(k==='events'){await one('th');await arr('ths');await one('title');await one('text')}
  else if(k==='stories'){await one('img');await one('text')}
  else if(k==='chat'){await one('t')}
  else if(k==='custom'){await one('t');await arr('o')}
  else if(k==='missions'){await one('note')}
  else if(k==='answers'){for(const f of Object.keys(d)){if(d[f]!==null&&d[f]!==undefined)d[f]=await fn(d[f],path,'any')}}
  return d;
}
async function encDoc(path,data){if(!key)return data;return mapDoc(path,data,(v,p,m)=>encVal(v,p,m))}
async function decDoc(path,data){if(!key)return data;return mapDoc(path,data,(v,p)=>decVal(v,p))}
/* c'è ancora qualcosa in chiaro che andrebbe cifrato? (serve alla migrazione) */
async function needsEnc(path,data){
  if(!data||typeof data!=='object')return false;
  let need=false;
  await mapDoc(path,data,async(v,p,m)=>{if(v!==null&&v!==undefined&&!isEnc(v)&&(m==='any'||typeof v==='string'))need=true;return v});
  return need;
}

/* --- prova della chiave: un valore noto, cifrato, salvato sul server --- */
const CHECK='cuoricino-ok';
async function makeCheck(){return encVal(CHECK,'couple/keycheck')}
async function tryKey(str,check){
  const u=b32dec(str); if(!u)return false;
  try{const k=await importRaw(u);return dec.decode(await decBytes(check.slice(3),'couple/keycheck',k))===CHECK}catch(e){return false}
}
async function verify(check){
  if(!key||!isEnc(check))return false;
  try{return dec.decode(await decBytes(check.slice(3),'couple/keycheck'))===CHECK}catch(e){return false}
}

window.DUCrypto={load:load,setKey:setKey,generate:generate,has:has,keyString:keyString,clear:clear,encDoc:encDoc,decDoc:decDoc,needsEnc:needsEnc,makeCheck:makeCheck,tryKey:tryKey,verify:verify,isEnc:isEnc,supported:()=>!!cs()};
})();
