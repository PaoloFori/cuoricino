import json,subprocess,time,urllib.request,sys,os,shutil
HERE=os.path.dirname(os.path.abspath(__file__)); APP=os.path.dirname(os.path.dirname(HERE))
import tempfile
S=sys.argv[1] if len(sys.argv)>1 else tempfile.mkdtemp(prefix='cuoricino-test-'); E=S+'/e2e'; os.makedirs(E,exist_ok=True)
shutil.rmtree(E+'/www',ignore_errors=True); os.makedirs(E+'/www')
for f in os.listdir(APP):
    if f.endswith(('.js','.html','.png','.webmanifest')): shutil.copy(APP+'/'+f,E+'/www/'+f)
h=open(E+'/www/index.html',encoding='utf-8').read().replace('https://*.supabase.co','http://127.0.0.1:8081'); open(E+'/www/index.html','w',encoding='utf-8').write(h)
shutil.copytree(APP+'/fonts',E+'/www/fonts')
open(E+'/www/config.js','w').write("window.SINTONIA_CFG={url:'http://127.0.0.1:8081',key:'k'};")
for d in ('prof-A','prof-B'): shutil.rmtree(E+'/'+d,ignore_errors=True)
sys.path.insert(0,HERE)
from phone import Phone
srv=[subprocess.Popen(['python3',HERE+'/mock.py','8081']),subprocess.Popen(['python3','-m','http.server','8080','--directory',E+'/www','--bind','127.0.0.1'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)]
time.sleep(1.5)
URL='http://127.0.0.1:8080/index.html'
def dump(): return json.load(urllib.request.urlopen('http://127.0.0.1:8081/__dump'))
fails=[]
def check(cond,msg):
    print(('PASS  ' if cond else 'FAIL  ')+msg)
    if not cond: fails.append(msg)
A=B=None
try:
    A=Phone('A',9401,URL,S)
    A.wait('[data-act=w-create]'); A.click('[data-act=w-create]'); A.wait('.bigcode')
    code=A.ev("document.querySelector('.bigcode').innerText").strip()
    key=A.ev("document.querySelector('p[style*=monospace]').innerText").strip()
    check(len(key)==64 and key.count('-')==12,'A: alla creazione compare la chiave di cifratura ('+key[:9]+'…)')
    ext=A.ev("performance.getEntriesByType('resource').map(function(r){return r.name}).filter(function(n){return n.indexOf(location.origin)!==0&&n.indexOf('127.0.0.1:8081')<0})")
    check(ext==[] and A.ev("document.fonts.check('800 20px \"Bricolage Grotesque\"')"),'PRIVACY: nessuna richiesta a siti esterni (nemmeno Google) e i caratteri si caricano da soli: '+str(ext))
    A.click('[data-act=w-go]'); A.wait('form[data-form=setup]')
    A.fill('#f-a','Anna'); A.fill('#f-since','2024-01-01'); A.submit('form[data-form=setup]')
    A.wait('[data-tab=quiz]'); A.click('[data-tab=quiz]'); A.click('[data-act=draw]'); A.wait('form[data-form=tans] input')
    A.fill('form[data-form=tans] input','SEGRETO-ANNA-TESTO-123'); A.submit('form[data-form=tans]'); time.sleep(3)
    # --- Phone B entra con il codice
    B=Phone('B',9402,URL,S)
    B.wait('[data-act=w-have]'); B.click('[data-act=w-have]'); B.wait('#f-code'); B.fill('#f-code',code); B.submit('form[data-form=join]')
    B.wait('form[data-form=key]',15); check(True,'B: dopo il codice, senza chiave resta bloccato sulla schermata della chiave')
    B.fill('#f-key','0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000-0000'); B.submit('form[data-form=key]'); time.sleep(.8)
    check('non è corretta' in B.text(),'B: una chiave sbagliata viene rifiutata')
    B.fill('#f-key',key); B.submit('form[data-form=key]'); time.sleep(2.5)
    B.wait('form[data-form=myname]',15); B.fill('#f-a','Luca'); B.submit('form[data-form=myname]')
    B.wait('[data-tab=quiz]'); B.click('[data-tab=quiz]'); B.wait('[data-act=deckopen]'); B.click('[data-act=deckopen]')
    B.wait('form[data-form=tans] input'); B.fill('form[data-form=tans] input','risposta di Luca'); B.submit('form[data-form=tans]'); time.sleep(3)
    t=B.text()
    check('SEGRETO-ANNA-TESTO-123' in t,'B (con la chiave giusta) legge la risposta di Anna decifrata')
    B.click('[data-act=chat]'); B.wait('form[data-form=chat] input'); B.fill('form[data-form=chat] input','MESSAGGIO-CHAT-B'); B.submit('form[data-form=chat]'); time.sleep(3); B.click('[data-act=chatback]')
    # --- A: nuova domanda, risposta con foto
    A.click('[data-act=draw]'); A.wait('[data-act=qphoto]'); A.click('[data-act=qphoto]'); A.file(APP+'/icon-512.png'); time.sleep(3)
    # --- B vede la foto di A
    B.click('[data-tab=home]'); B.click('[data-tab=quiz]'); B.wait('[data-act=deckopen]'); B.click('[data-act=deckopen]')
    B.wait('form[data-form=tans] input'); B.fill('form[data-form=tans] input','vista!'); B.submit('form[data-form=tans]')
    ok=False
    for _ in range(40):
        v=B.ev("(function(){var i=document.querySelector('img.qimg');return i?i.src.slice(0,22):''})()")
        if v.startswith('data:image/jpeg'): ok=True;break
        time.sleep(.5)
    check(ok,'B vede la foto di Anna (decifrata)')
    B.shot(E+'/B-foto.png')
    # --- Cosa ha visto davvero il server
    d=dump(); docs=d['docs']; raw=json.dumps(docs)
    check(not any(x in raw for x in ['SEGRETO-ANNA-TESTO-123','risposta di Luca','MESSAGGIO-CHAT-B','vista!']),'SERVER: nessun testo in chiaro (risposte e chat)')
    check('/9j/' not in raw and 'iVBOR' not in raw,'SERVER: nessuna foto leggibile (né JPEG né PNG in chiaro)')
    pf=[x for x in docs if x['path'].startswith('photofull/')]
    check(len(pf)>=1 and all(str(x['data'].get('img','')).startswith('f2:') for x in pf),'SERVER: le foto intere sono cifrate (%d)'%len(pf))
    an=[x for x in docs if x['path'].startswith('answers/')]
    check(len(an)==2 and all(all(str(v).startswith('f') and str(v)[2]==':' for v in x['data'].values()) for x in an),'SERVER: tutte le risposte (anche numeri e sì/no) sono cifrate, restano solo i nomi dei campi')
    ch=[x for x in docs if x['path'].startswith('chat/')]
    check(len(ch)>=1 and all(all(str(v).startswith('f') and str(v)[2]==':' for v in x['data'].values()) for x in ch),'SERVER: i messaggi della chat sono cifrati (anche autore e data)')
    gm=[x for x in docs if x['path'].startswith('games/')]
    check(len(gm)==0 or all(all(str(v).startswith('f') and str(v)[2]==':' for v in x['data'].values()) for x in gm),'SERVER: anche le partite sono cifrate')
    kc=[x for x in docs if x['path']=='couple/keycheck']; check(len(kc)==1 and key.replace('-','') not in raw.replace('-',''),'SERVER: c\'è la prova della chiave ma non la chiave')
    prof=[x for x in docs if x['path']=='couple/profile']; check(len(prof)==1 and 'Anna' not in json.dumps(prof) and 'Luca' not in json.dumps(prof),'SERVER: anche i nomi sono cifrati')
    sl=[x for x in docs if x['path'].startswith('slots/')]; check(len(sl)==2 and all(x['data'].get('s') in ('A','B') for x in sl),'SERVER: restano in chiaro solo i posti A/B (servono a notifiche e revoca)')
    # --- Migrazione di dati vecchi in chiaro
    sess=json.loads(A.ev("localStorage.getItem('sintonia-cloud-v1')")); tok=sess['sess']['at']; cid=sess['couple']['id']
    def put(path,data):
        req=urllib.request.Request('http://127.0.0.1:8081/rest/v1/docs?on_conflict=couple,path',data=json.dumps({'couple':cid,'path':path,'data':data,'deleted':False}).encode(),headers={'Authorization':'Bearer '+tok,'Content-Type':'application/json'},method='POST'); urllib.request.urlopen(req)
    put('photofull/vecchia1',{'img':'data:image/jpeg;base64,'+'/9j/'+'QUJD'*50}); put('chat/vecchio1',{'th':'k1','by':'A','at':1,'t':'MESSAGGIO-VECCHIO-IN-CHIARO'})
    time.sleep(4)
    A.click('[data-tab=noi]'); A.wait('[data-act=e2e-migrate]'); A.shot(E+'/A-noi.png'); A.click('[data-act=e2e-migrate]'); time.sleep(5)
    raw2=json.dumps(dump()['docs'])
    check('MESSAGGIO-VECCHIO-IN-CHIARO' not in raw2,'MIGRAZIONE: il messaggio vecchio in chiaro è stato cifrato')
    old=[x for x in dump()['docs'] if x['path']=='photofull/vecchia1']
    check(old and str(old[0]['data']['img']).startswith('f2:'),'MIGRAZIONE: la foto vecchia in chiaro è stata cifrata')

    # --- PIN: la chiave si chiude, l'app si blocca, il PIN sbagliato non apre
    A.click('[data-tab=noi]'); A.wait('form[data-form=pinset]'); A.fill('#f-pin','frase-lunga-2026'); A.fill('#f-pin2','frase-lunga-2026'); A.submit('form[data-form=pinset]'); time.sleep(2)
    ls=A.ev("JSON.stringify(Object.assign({},localStorage))")
    check('cuoricino-e2e-w' in ls and '"cuoricino-e2e":' not in ls and key.replace('-','') not in ls.replace('-',''),'PIN: la chiave non è più in chiaro nella memoria del telefono')
    A.ev("location.reload()"); time.sleep(2); A.wait('form[data-form=pin]',15); check(True,'PIN: dopo la riapertura l\'app chiede il PIN e non mostra i dati')
    check('Anna' not in A.text() and 'SEGRETO' not in A.text(),'PIN: da bloccata non si vede nessun dato')
    A.fill('#f-pin','sbagliato'); A.submit('form[data-form=pin]'); time.sleep(2.5); check('non corretto' in A.text(),'PIN: un PIN sbagliato viene rifiutato')
    A.fill('#f-pin','frase-lunga-2026'); A.submit('form[data-form=pin]'); A.wait('[data-tab=quiz]',20); check(True,'PIN: con il PIN giusto l\'app si apre')
    A.ev("localStorage.setItem('cuoricino-lock-after','0'); Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); setTimeout(function(){Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange'))},300); 1")
    time.sleep(2.5); A.wait('form[data-form=pin]',15); check(True,'PIN: lasciando l\'app si blocca da sola')
    A.fill('#f-pin','frase-lunga-2026'); A.submit('form[data-form=pin]'); A.wait('[data-tab=quiz]',20)
    # --- cambio chiave
    A.click('[data-tab=noi]'); A.wait('[data-act=rot]'); A.click('[data-act=rot]'); A.wait('[data-act=rot-yes]'); A.click('[data-act=rot-yes]')
    for _ in range(80):
        time.sleep(1)
        if A.exists('p[style*=monospace]') and not A.ev("!!document.querySelector('[data-act=e2e-migrate][disabled]')"): break
    time.sleep(2)
    key2=A.ev("(document.querySelector('p[style*=monospace]')||{}).innerText||''").strip()
    check(len(key2)==64 and key2!=key,'CAMBIO CHIAVE: compare la chiave nuova (diversa dalla vecchia)')
    docs2=dump()['docs']; raw3=json.dumps(docs2)
    check(all(all(str(v).startswith('f') and str(v)[2]==':' for v in x['data'].values()) for x in docs2 if x['data'] and not x['path'].startswith(('slots/','couple/keycheck','couple/rotating'))),'CAMBIO CHIAVE: dopo, sul server è tutto ancora cifrato')
    check(not any(x in raw3 for x in ['SEGRETO-ANNA-TESTO-123','risposta di Luca','MESSAGGIO-CHAT-B']),'CAMBIO CHIAVE: nessun testo in chiaro neppure durante il cambio')
    # B ha ancora la chiave vecchia: deve fermarsi e chiedere la nuova
    B.wait('form[data-form=key]',25); check(True,'CAMBIO CHIAVE: l\'altro telefono, con la chiave vecchia, si ferma e chiede quella nuova')
    B.fill('#f-key',key); B.submit('form[data-form=key]'); time.sleep(.8); check('non è corretta' in B.text(),'CAMBIO CHIAVE: la chiave vecchia non apre più niente')
    B.fill('#f-key',key2); B.submit('form[data-form=key]'); time.sleep(3.5)
    B.wait('[data-tab=noi]',20); B.click('[data-tab=noi]'); time.sleep(2)
    tn=B.text(); check('Anna' in tn and 'Luca' in tn,'CAMBIO CHIAVE: con la chiave nuova B rilegge i nomi (profilo ricifrato)')
    # prova indipendente: decifro io, fuori dall'app, con la chiave nuova e con la vecchia
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import base64
    def key_bytes(k):
        B32='0123456789ABCDEFGHJKMNPQRSTVWXYZ'; bits=''.join(format(B32.index(c),'05b') for c in k.replace('-',''))
        return bytes(int(bits[i*8:i*8+8],2) for i in range(32))
    def tryopen(kk,path,field,val):
        try:
            u=base64.b64decode(val[3:]); return AESGCM(key_bytes(kk)).decrypt(u[:12],u[12:],(path+'#'+field).encode())
        except Exception: return None
    pf2=[x for x in dump()['docs'] if x['path'].startswith('photofull/') and 'vecchia' not in x['path']]
    okn=all(tryopen(key2,x['path'],'img',x['data']['img']) is not None for x in pf2); oko=any(tryopen(key,x['path'],'img',x['data']['img']) is not None for x in pf2)
    check(len(pf2)>=1 and okn,'CAMBIO CHIAVE: le foto sul server si aprono con la chiave nuova (decifrate fuori dall\'app)')
    check(not oko,'CAMBIO CHIAVE: e NON si aprono più con la chiave vecchia')
    an2=[x for x in dump()['docs'] if x['path']=='answers/A'][0]; f0=list(an2['data'].keys())[0]
    check(tryopen(key2,'answers/A',f0,an2['data'][f0]) is not None and tryopen(key,'answers/A',f0,an2['data'][f0]) is None,'CAMBIO CHIAVE: anche le risposte (di entrambi) sono passate alla chiave nuova')
    import re as _re
    check(not _re.search(r'\bf[123]:',B.text()),'CAMBIO CHIAVE: sullo schermo di B nessun dato resta cifrato/illeggibile')
    # --- Cancellazione dal server
    A.click('[data-act=wipe]'); A.click('[data-act=wipe-yes]')
    for _ in range(30):
        time.sleep(.5)
        if not dump()['docs']: break
    d3=dump(); check(len(d3['docs'])==0 and d3['members']==0,'CANCELLAZIONE: il server non ha più nulla della coppia')
    bad=[(ph.name,l) for ph in (A,B) for l in ph.logs if ('ERR' in l or 'EXC' in l) and 'favicon' not in l]
    for n,l in bad: print('LOG',n,l[:220])
    check(not any('Content Security Policy' in l for n,l in bad),'CSP: nessuna richiesta bloccata dalla protezione (tutto il resto funziona con le regole attive)')
    check(not bad,'nessun errore JavaScript durante tutto il test')
finally:
    for ph in (A,B):
        if ph: ph.close()
    for p in srv: p.kill()
print('\nRISULTATO:', 'TUTTO OK' if not fails else 'FALLITI: %d'%len(fails))
for f in fails: print(' -',f)
