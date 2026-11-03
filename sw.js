/* Cuoricino: service worker.
   Strategia "rete prima": a ogni apertura scarica i file nuovi (se online), altrimenti usa la copia salvata.
   Così ogni aggiornamento arriva da solo, senza togliere e rimettere l'app dalla Home.
   I dati (risposte, foto, storie) NON stanno nella cache dei file: sono nel server e nella memoria del telefono,
   quindi un aggiornamento non li tocca. Non cambiare l'indirizzo dell'app, o il telefono la vede come un'altra app. */
const V='sintonia-v14';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./content.js','./games.js','./app.js','./cloud.js','./config.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin&&!/fonts\.(googleapis|gstatic)\.com$/.test(u.host))return;
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(r=>{
      if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}
      return r;
    }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match('./index.html')))
  );
});
