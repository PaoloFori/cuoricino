import json,subprocess,time,urllib.request,sys,os,shutil
HERE=os.path.dirname(os.path.abspath(__file__)); APP=os.path.dirname(os.path.dirname(HERE))
import tempfile
S=sys.argv[1] if len(sys.argv)>1 else tempfile.mkdtemp(prefix='cuoricino-test-'); E=S+'/e2e'; os.makedirs(E,exist_ok=True)
shutil.rmtree(E+'/www',ignore_errors=True); os.makedirs(E+'/www')
for f in os.listdir(APP):
    if f.endswith(('.js','.html','.png','.webmanifest')): shutil.copy(APP+'/'+f,E+'/www/'+f)
h=open(E+'/www/index.html',encoding='utf-8').read().replace('https://*.supabase.co','http://127.0.0.1:8081'); open(E+'/www/index.html','w',encoding='utf-8').write(h)
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
    B.fill('form[data-form=chat] input','MESSAGGIO-CHAT-B'); B.submit('form[data-form=chat]'); time.sleep(3)
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
    check(len(pf)>=1 and all(str(x['data'].get('img','')).startswith('e2:') for x in pf),'SERVER: le foto intere sono cifrate (%d)'%len(pf))
    an=[x for x in docs if x['path'].startswith('answers/')]
    check(len(an)==2 and all(all(str(v).startswith('e3:') for v in x['data'].values()) for x in an),'SERVER: tutte le risposte sono cifrate, chiavi tecniche a parte')
    ch=[x for x in docs if x['path'].startswith('chat/')]
    check(len(ch)>=1 and all(str(x['data'].get('t','')).startswith('e1:') for x in ch),'SERVER: i messaggi della chat sono cifrati')
    kc=[x for x in docs if x['path']=='couple/keycheck']; check(len(kc)==1 and key.replace('-','') not in raw.replace('-',''),'SERVER: c\'è la prova della chiave ma non la chiave')
    prof=[x for x in docs if x['path']=='couple/profile']; check(len(prof)==1,'SERVER: il profilo (nomi) resta in chiaro, serve alle notifiche')
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
    check(old and str(old[0]['data']['img']).startswith('e2:'),'MIGRAZIONE: la foto vecchia in chiaro è stata cifrata')
    # --- Cancellazione dal server
    A.click('[data-act=wipe]'); A.click('[data-act=wipe-yes]'); time.sleep(3)
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
