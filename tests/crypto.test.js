const fs=require('fs'), path=require('path'), assert=require('assert'), nodeCrypto=require('crypto');
global.window=global; const store={}; global.localStorage={getItem:k=>(k in store)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
eval(fs.readFileSync(path.join(__dirname,'..','crypto.js'),'utf8'));
const C=window.DUCrypto; const ok=m=>console.log('  ok  '+m);
const rb=n=>nodeCrypto.randomBytes(n);
(async()=>{
 assert(C.supported()); assert(!C.has());
 assert.deepStrictEqual(await C.encDoc('chat/1',{t:'ciao'}),{t:'ciao'}); ok('senza chiave i dati passano in chiaro (coppie non ancora cifrate)');
 await C.generate(); assert(C.has());
 const ks=C.keyString(); assert(/^([0-9A-Z]{4}-){12}[0-9A-Z]{4}$/.test(ks),ks);
 const img='data:image/jpeg;base64,'+rb(150000).toString('base64');
 const docs={
  'chat/1':{id:'x',th:'k5',by:'A',at:5,t:'ti penso'},
  'photofull/p1':{img},
  'photos/p1':{by:'A',at:1,cap:'',th:img.slice(0,23+400)},
  'events/e1':{by:'B',date:'2024-01-01',title:'Il primo viaggio',text:'Che bello',th:img.slice(0,23+400),ths:[img.slice(0,23+400),img.slice(0,23+800)],hot:false},
  'answers/A':{k5:2,d2026:'testo libero',hotok:true,note:{t:'nota segreta',at:1},loc:{la:41.9,lo:12.5,at:3},av:img.slice(0,23+400),bd:'03-04'},
  'missions/2026-11-04_A':{slot:'A',date:'2026-11-04',done:true,note:"ce l'ho fatta",ph:'m123'},
  'custom/c1':{by:'A',t:'Una domanda nostra?',o:['sì','no'],hot:true},
  'games/g1':{type:'q20',secret:'SEGRETO-GIOCO',cards:[{l:'Il nostro primo viaggio a Lisbona'}],turn:'A',w:null,at:9},
  'couple/profile':{names:{A:'Anna',B:'Luca'},since:'2024-01-01'},
  'couple/scores':{A:3,B:2},'couple/draw':{i:42,at:1}
 };
 const SECRETS=['ti penso','Il primo viaggio','Che bello','testo libero','nota segreta',"ce l'ho fatta",'Una domanda nostra','SEGRETO-GIOCO','Lisbona','Anna','Luca','2024-01-01','"la":41.9'];
 for(const [p,d] of Object.entries(docs)){
   const e=await C.encDoc(p,d), s=JSON.stringify(e);
   for(const bad of SECRETS)assert(!s.includes(bad),p+' contiene '+bad);
   assert(!s.includes('/9j/'),p+' contiene una foto in chiaro');
   assert.deepStrictEqual(await C.decDoc(p,e),d,p+' non torna');
   assert(!(await C.needsEnc(p,e)),p+' needsEnc dopo cifratura'); assert(await C.needsEnc(p,d),p+' needsEnc prima');
   assert(await C.allOpen(p,e));
 }
 ok('tutti i tipi di documento (anche partite, profilo, punteggi): nessun testo in chiaro, tornano identici');
 // il server vede solo i nomi dei campi: i valori, anche i numeri, sono cifrati
 const ea=await C.encDoc('answers/A',docs['answers/A']); assert.strictEqual(Object.keys(ea).join(),Object.keys(docs['answers/A']).join());
 assert(Object.values(ea).every(v=>/^f[123]:/.test(v))); ok('anche numeri e booleani sono cifrati; restano solo i nomi dei campi');
 // documenti di servizio restano in chiaro
 assert.deepStrictEqual(await C.encDoc('slots/u1',{s:'A',at:1}),{s:'A',at:1}); assert.deepStrictEqual(await C.encDoc('couple/keycheck',{v:'x'}),{v:'x'}); ok('slots e prova della chiave restano in chiaro (servono al server)');
 // legato al documento
 const c=await C.encDoc('chat/1',docs['chat/1']); const moved=await C.decDoc('chat/2',c); assert(moved.t.startsWith('f1:')); ok('un valore spostato in un altro documento non si apre');
 // legato al campo: lo scambio dentro lo stesso documento non funziona
 const ev=await C.encDoc('events/e1',docs['events/e1']); const sw=Object.assign({},ev,{title:ev.text,text:ev.title});
 const dsw=await C.decDoc('events/e1',sw); assert(dsw.title.startsWith('f1:')&&dsw.text.startsWith('f1:'),'scambio campi riuscito!'); ok('scambiare due campi dello stesso documento non funziona');
 const an=await C.encDoc('answers/A',{k1:'risposta uno',k2:'risposta due'}); const san=await C.decDoc('answers/A',{k1:an.k2,k2:an.k1}); assert(san.k1.startsWith('f1:')&&san.k2.startsWith('f1:')); ok('scambiare due risposte tra loro non funziona');
 // chiave giusta/sbagliata/manomissione
 const chk=await C.makeCheck(); assert(await C.verify(chk)); assert(await C.tryKey(ks,chk));
 const other='0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000';
 assert(!(await C.tryKey(other,chk))&&!(await C.tryKey('abc',chk))); ok('chiave sbagliata rifiutata');
 const t=c.t; const tam=t.slice(0,-4)+(t.slice(-4)==='AAAA'?'BBBB':'AAAA'); assert((await C.decDoc('chat/1',{...c,t:tam})).t.startsWith('f1:')); ok('un byte cambiato: non si apre');
 // formato vecchio ancora leggibile, e segnalato da migrare
 const k=await crypto.subtle.importKey('raw',Buffer.from(Array.from(ks.replace(/-/g,'')).length?require('crypto').createHash('sha256').update('x').digest():[]),'AES-GCM',false,['encrypt']);
 // costruisco un valore "vecchio" con la stessa chiave: AAD = solo il percorso
 const keyBytes=(()=>{const B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ',s=ks.replace(/-/g,'');let bits='';for(const ch of s)bits+=B32.indexOf(ch).toString(2).padStart(5,'0');const u=new Uint8Array(32);for(let i=0;i<32;i++)u[i]=parseInt(bits.slice(i*8,i*8+8),2);return u})();
 const kk=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['encrypt']);
 const iv=rb(12), ct=Buffer.from(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:Buffer.from('chat/old')},kk,Buffer.from('messaggio vecchio')));
 const legacy={t:'e1:'+Buffer.concat([iv,ct]).toString('base64'),by:'A'};
 assert.strictEqual((await C.decDoc('chat/old',legacy)).t,'messaggio vecchio'); assert(await C.needsEnc('chat/old',legacy)); ok('il formato vecchio si legge ancora e viene segnalato da aggiornare');
 // PIN
 const hasRaw=()=>store['cuoricino-e2e']!==undefined;
 assert(hasRaw()&&!C.hasPin());
 assert(await C.protect('Un-PIN-lungo-2026')); assert(C.hasPin()&&!hasRaw(),'la chiave è rimasta in chiaro'); 
 assert(!JSON.stringify(store).includes(ks.replace(/-/g,'')),'la chiave è visibile nella memoria del browser');
 C.lock(); assert(!C.has()&&C.isLocked()); assert.strictEqual(await C.load(),'locked');
 assert.strictEqual((await C.decDoc('chat/1',c)).t.startsWith('f1:'),true,'da bloccato i dati devono restare illeggibili');
 assert(!(await C.unlock('pin sbagliato'))&&!C.has()); assert(await C.unlock('Un-PIN-lungo-2026')&&C.has()); assert.strictEqual((await C.decDoc('chat/1',c)).t,'ti penso'); ok('PIN: la chiave non sta più in chiaro, blocco e sblocco, PIN sbagliato rifiutato');
 // PIN dimenticato: la chiave lunga lo sostituisce
 C.lock(); assert(!(await C.resetPin(other,'nuovo-pin-2026'))); assert(await C.resetPin(ks,'nuovo-pin-2026')); C.lock(); assert(!(await C.unlock('Un-PIN-lungo-2026'))); assert(await C.unlock('nuovo-pin-2026')); ok('PIN dimenticato: si reimposta solo con la chiave giusta');
 assert(await C.removePin()&&!C.hasPin()&&hasRaw()); ok('si può togliere il PIN');
 // cambio chiave
 const before=await C.encDoc('chat/9',{t:'prima del cambio'}); const beforeA=await C.encDoc('answers/B',{k1:'risposta di Luca'});
 assert(await C.beginRotation()); assert(C.rotating()); const ks2=C.keyString(); assert.notStrictEqual(ks2,ks);
 assert.strictEqual((await C.decDoc('chat/9',before)).t,'prima del cambio','durante il cambio i dati vecchi devono restare leggibili');
 assert(!(await C.allOpen('chat/9',before))); const re=await C.reencrypt('chat/9',before); assert(await C.allOpen('chat/9',re)); assert.strictEqual((await C.decDoc('chat/9',re)).t,'prima del cambio');
 const reA=await C.reencrypt('answers/B',beforeA); assert(await C.allOpen('answers/B',reA)&&(await C.decDoc('answers/B',reA)).k1==='risposta di Luca');
 const chk2=await C.makeCheck(); await C.endRotation(); assert(!C.rotating());
 assert(!(await C.tryKey(ks,chk2))&&await C.tryKey(ks2,chk2),'dopo il cambio la vecchia chiave non deve più aprire la prova');
 assert((await C.decDoc('chat/9',before)).t.startsWith('f1:'),'dopo il cambio un dato non ricifrato deve restare illeggibile'); assert.strictEqual((await C.decDoc('chat/9',re)).t,'prima del cambio');
 ok('cambio chiave: dati vecchi leggibili durante il cambio, poi aperti solo dalla chiave nuova');
 // blocco durante un cambio (aggiornamento in corso): niente scritture
 C.freeze(true); let threw=false; try{await C.encDoc('chat/1',{t:'x'})}catch(e){threw=true} C.freeze(false); assert(threw); ok('in corso di aggiornamento le scritture sono bloccate');
 // formato della chiave tollerante a O/I/L
 const keep=C.keyString(); assert(await C.setKey(keep.toLowerCase().replace(/0/g,'o').replace(/1/g,'l'))); assert.strictEqual((await C.decDoc('chat/9',re)).t,'prima del cambio'); ok('la chiave scritta a mano con o/l al posto di 0/1 funziona');
 console.log('\nOK crypto: tutti i test passati');
})().catch(e=>{console.error('FALLITO',e.stack||e.message);process.exit(1)});
