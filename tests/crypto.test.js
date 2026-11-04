const fs=require('fs');
global.window=global; const store={}; global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
eval(fs.readFileSync(require('path').join(__dirname,'..','crypto.js'),'utf8'));
const C=window.DUCrypto; const assert=require('assert');
(async()=>{
 assert(C.supported());
 assert(!C.has());
 // senza chiave: passa in chiaro
 assert.deepStrictEqual(await C.encDoc('chat/1',{t:'ciao'}),{t:'ciao'});
 await C.generate(); assert(C.has());
 const ks=C.keyString(); assert(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/.test(ks),ks);
 const img='data:image/jpeg;base64,'+require('crypto').randomBytes(150000).toString('base64');
 const docs={
  'chat/1':{id:'x',th:'k5',by:'A',at:5,t:'ti penso'},
  'photofull/p1':{img},
  'photos/p1':{by:'A',at:1,cap:'',th:img.slice(0,23+400)},
  'events/e1':{by:'B',date:'2024-01-01',title:'Il primo viaggio',text:'Che bello',th:img,ths:[img,img],hot:false},
  'answers/A':{k5:2,d2026:'testo libero',hotok:true,note:{t:'nota segreta',at:1},loc:{la:41.9,lo:12.5,at:3},av:img,bd:'03-04'},
  'missions/2026-11-04_A':{slot:'A',date:'2026-11-04',done:true,note:'ce l\'ho fatta',ph:'m123'},
  'custom/c1':{by:'A',t:'Una domanda nostra?',o:['sì','no'],hot:true}
 };
 for(const [p,d] of Object.entries(docs)){
   const e=await C.encDoc(p,d), s=JSON.stringify(e);
   // nessun testo in chiaro sensibile
   for(const bad of ['ti penso','Il primo viaggio','Che bello','testo libero','nota segreta','ce l\'ho fatta','Una domanda nostra','/9j/'].concat(p.startsWith('photofull')?[img.slice(30,80)]:[])) assert(!s.includes(bad),p+' contiene '+bad);
   const back=await C.decDoc(p,e);
   assert.deepStrictEqual(back,d,p+' non torna');
   assert(!(await C.needsEnc(p,e)),p+' needsEnc dopo cifratura');
   assert((await C.needsEnc(p,d)),p+' needsEnc prima');
 }
 // etichette tecniche restano in chiaro (serve al server e alle query)
 const ea=await C.encDoc('answers/A',docs['answers/A']); assert(Object.keys(ea).join()===Object.keys(docs['answers/A']).join());
 assert(ea.k5.startsWith('e3:'));
 // doc non sensibili invariati
 assert.deepStrictEqual(await C.encDoc('couple/profile',{names:{A:'Anna'}}),{names:{A:'Anna'}});
 // legato al percorso: spostare un valore cifrato altrove non si decifra
 const c=await C.encDoc('chat/1',docs['chat/1']); const moved=await C.decDoc('chat/2',c); assert(moved.t.startsWith('e1:'),'AAD non legato al percorso');
 // chiave giusta / sbagliata
 const chk=await C.makeCheck(); assert(await C.verify(chk)); assert(await C.tryKey(ks,chk));
 const other='0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000';
 assert(!(await C.tryKey(other,chk)),'chiave sbagliata accettata'); assert(!(await C.tryKey('abc',chk)));
 // senza chiave i dati cifrati restano illeggibili
 const keep=C.keyString(); C.clear(); assert(!C.has());
 const still=await C.decDoc('chat/1',c); assert(still.t.startsWith('e1:'));
 // ricaricando la chiave si riapre
 assert(await C.setKey(keep)); assert((await C.decDoc('chat/1',c)).t==='ti penso');
 // manomissione: un byte cambiato non si decifra
 const tam=c.t.slice(0,-4)+(c.t.slice(-4)==='AAAA'?'BBBB':'AAAA'); assert((await C.decDoc('chat/1',{...c,t:tam})).t.startsWith('e1:'));
 // lettura/scrittura con formato più comodo (O/I/L)
 assert(await C.setKey(keep.toLowerCase().replace(/0/g,'o').replace(/1/g,'l')));
 assert((await C.decDoc('chat/1',c)).t==='ti penso');
 console.log('OK crypto: tutti i test passati');
})().catch(e=>{console.error('FALLITO',e.message);process.exit(1)});
