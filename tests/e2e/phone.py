import json,subprocess,time,urllib.request,base64,websocket
class Phone:
    def __init__(s,name,port,url,S):
        s.name=name; s.n=0; s.logs=[]
        s.p=subprocess.Popen(['google-chrome','--headless=new','--no-sandbox','--disable-gpu','--user-data-dir=%s/e2e/prof-%s'%(S,name),'--remote-debugging-port=%d'%port,'--window-size=390,1000','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(60):
            try: tabs=json.load(urllib.request.urlopen('http://127.0.0.1:%d/json'%port)); break
            except Exception: time.sleep(.2)
        s.ws=websocket.create_connection([t for t in tabs if t['type']=='page'][0]['webSocketDebuggerUrl'])
        s.call('Runtime.enable'); s.call('Page.enable'); s.call('DOM.enable'); s.call('Log.enable')
        s.call('Emulation.setDeviceMetricsOverride',width=390,height=1000,deviceScaleFactor=1,mobile=True)
        s.call('Page.navigate',url=url); time.sleep(2)
    def call(s,m,**pr):
        s.n+=1; i=s.n; s.ws.send(json.dumps({'id':i,'method':m,'params':pr}))
        while True:
            r=json.loads(s.ws.recv())
            if r.get('method')=='Runtime.exceptionThrown': s.logs.append('EXC '+str(r['params']['exceptionDetails'].get('exception',{}).get('description')))
            if r.get('method')=='Runtime.consoleAPICalled' and r['params']['type']=='error': s.logs.append('ERR '+str(r['params']['args'][0].get('value')))
            if r.get('method')=='Log.entryAdded' and r['params']['entry'].get('level')=='error': s.logs.append('ERR '+r['params']['entry'].get('text',''))
            if r.get('id')==i: return r
    def ev(s,js):
        r=s.call('Runtime.evaluate',expression=js,returnByValue=True,awaitPromise=True)['result']
        if 'exceptionDetails' in r: raise Exception('JS: '+str(r['exceptionDetails'].get('exception',{}).get('description')))
        return r['result'].get('value')
    def click(s,sel):
        v=s.ev("(function(){var e=document.querySelector(%s);if(!e)return 'MISSING';e.click();return 'ok'})()"%json.dumps(sel))
        if v!='ok': raise Exception('non trovo '+sel+' | pagina: '+s.text()[:200])
        time.sleep(.5)
    def exists(s,sel): return s.ev("!!document.querySelector(%s)"%json.dumps(sel))
    def text(s): return s.ev("document.body.innerText")
    def wait(s,sel,t=12):
        for _ in range(int(t*4)):
            if s.exists(sel): return True
            time.sleep(.25)
        raise Exception('timeout '+sel+' | '+s.text()[:300])
    def fill(s,sel,val):
        s.ev("(function(){var e=document.querySelector(%s);e.value=%s;e.dispatchEvent(new Event('input',{bubbles:true}));return 1})()"%(json.dumps(sel),json.dumps(val)))
    def submit(s,sel):
        s.ev("(function(){var f=document.querySelector(%s);f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));return 1})()"%json.dumps(sel)); time.sleep(.8)
    def file(s,path):
        doc=s.call('DOM.getDocument')['result']['root']['nodeId']; nid=s.call('DOM.querySelector',nodeId=doc,selector='#f-photo')['result']['nodeId']
        s.call('DOM.setFileInputFiles',files=[path],nodeId=nid); time.sleep(2)
    def shot(s,path):
        r=s.call('Page.captureScreenshot',format='png'); open(path,'wb').write(base64.b64decode(r['result']['data']))
    def close(s):
        try: s.p.kill()
        except Exception: pass
