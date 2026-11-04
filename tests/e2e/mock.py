# Finto Supabase per i test: auth anonima, rpc della coppia, tabella docs con le stesse regole di accesso (solo membri).
import json,time,uuid,re,threading,sys
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,unquote
L=threading.Lock()
couples={}; members=set(); docs={}; push={}
def now(): return '%020.6f'%time.time()
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def cors(self):
        self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','*'); self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS')
    def out(self,code,obj):
        b=json.dumps(obj).encode(); self.send_response(code); self.cors(); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def uid(self):
        a=self.headers.get('Authorization','')
        return a[len('Bearer tok-'):] if a.startswith('Bearer tok-') else None
    def do_OPTIONS(self): self.send_response(204); self.cors(); self.end_headers()
    def body(self):
        n=int(self.headers.get('Content-Length') or 0); r=self.rfile.read(n) if n else b''
        try: return json.loads(r) if r else {}
        except Exception: return {}
    def do_POST(self):
        u=urlparse(self.path); b=self.body()
        with L:
            if u.path=='/auth/v1/signup':
                i=str(uuid.uuid4()); return self.out(200,{'access_token':'tok-'+i,'refresh_token':'r-'+i,'expires_in':3600,'user':{'id':i}})
            if u.path=='/auth/v1/token':
                i=b.get('refresh_token','r-')[2:]; return self.out(200,{'access_token':'tok-'+i,'refresh_token':'r-'+i,'expires_in':3600,'user':{'id':i}})
            me=self.uid()
            if u.path.startswith('/rest/v1/rpc/'):
                fn=u.path.split('/')[-1]
                if not me: return self.out(401,{'message':'non autenticato'})
                if fn=='create_couple':
                    cid=str(uuid.uuid4()); code=uuid.uuid4().hex[:8].upper(); couples[cid]={'code':code,'dev':None}; members.add((cid,me)); return self.out(200,{'id':cid,'code':code})
                if fn=='join_couple':
                    c=b['c'].upper(); cid=next((k for k,v in couples.items() if v['code']==c),None)
                    if not cid: return self.out(400,{'message':'codice non valido'})
                    n=len([1 for (x,y) in members if x==cid and y!=me])
                    if n>=2: return self.out(400,{'message':'coppia già completa'})
                    members.add((cid,me)); return self.out(200,{'id':cid,'code':c})
                if fn=='save_push': push[me]=b; return self.out(200,None)
                if fn=='drop_push': push.pop(me,None); return self.out(200,None)
                if fn=='delete_couple':
                    cid=next((x for (x,y) in members if y==me),None)
                    if cid:
                        couples.pop(cid,None); [members.discard(m) for m in list(members) if m[0]==cid]
                        for k in [k for k in docs if k[0]==cid]: docs.pop(k)
                    return self.out(200,None)
                return self.out(404,{'message':'rpc?'})
            if u.path=='/rest/v1/docs':
                cid=b.get('couple')
                if (cid,me) not in members: return self.out(403,{'message':'rls'})
                docs[(cid,b['path'])]={'couple':cid,'path':b['path'],'data':b.get('data'),'deleted':bool(b.get('deleted')),'updated_at':now()}; return self.out(201,None)
        self.out(404,{})
    def do_GET(self):
        u=urlparse(self.path); q=parse_qs(u.query)
        if u.path=='/__dump':
            with L: return self.out(200,{'docs':[dict(v) for v in docs.values()],'members':len(members)})
        with L:
            me=self.uid()
            if u.path!='/rest/v1/docs': return self.out(404,{})
            cid=(q.get('couple') or [''])[0][3:]
            if (cid,me) not in members: return self.out(200,[])
            rows=[v for (c,p),v in docs.items() if c==cid]
            def ok(r):
                for f in ('path','deleted','updated_at'):
                    for cond in q.get(f,[]):
                        val=r[f]
                        if f=='deleted': val=str(val).lower()
                        if cond.startswith('eq.'):
                            if str(val)!=unquote(cond[3:]): return False
                        elif cond.startswith('gt.'):
                            if not str(val)>unquote(cond[3:]): return False
                        elif cond.startswith('not.like.'):
                            if re.fullmatch(re.escape(unquote(cond[9:])).replace('\\*','.*'),val): return False
                        elif cond.startswith('like.'):
                            if not re.fullmatch(re.escape(unquote(cond[5:])).replace('\\*','.*'),val): return False
                return True
            rows=sorted([r for r in rows if ok(r)],key=lambda r:r['updated_at'] if 'updated_at' not in q.get('order',[''])[0] else r['updated_at'])
            if q.get('order',[''])[0].startswith('path'): rows.sort(key=lambda r:r['path'])
            lim=int((q.get('limit') or ['1000'])[0]); sel=(q.get('select') or ['*'])[0].split(',')
            rows=[{k:r[k] for k in sel if k in r} if sel!=['*'] else r for r in rows[:lim]]
            self.out(200,rows)
ThreadingHTTPServer(('127.0.0.1',int(sys.argv[1])),H).serve_forever()
