import http.client, json, sys, threading, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'service'))
from serve import Handler,ThreadingHTTPServer,TOKEN

class Service(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join(timeout=5)
    def request(self,method,path,body=None,headers=None):
        c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=10)
        c.request(method,path,body,headers or {});r=c.getresponse();status=r.status;data=r.read();c.close();return status,data
    def test_health_and_actual_computation(self):
        status,data=self.request('GET','/api/health');self.assertEqual(status,200);self.assertEqual(json.loads(data)['engine'],'Tellurium')
        status,data=self.request('POST','/api/simulate','{}',{'Content-Type':'application/json','X-Entelloq-Token':TOKEN})
        self.assertEqual(status,200);self.assertEqual(len(json.loads(data)['rows']),201)
    def test_origin_host_and_token(self):
        for headers in ({'Origin':'https://untrusted.example'},{'Host':'untrusted.example'}):
            self.assertEqual(self.request('GET','/api/health',headers=headers)[0],403)
        self.assertEqual(self.request('POST','/api/simulate','{}',{'Content-Type':'application/json'})[0],403)
    def test_no_private_files_or_encoded_traversal(self):
        for method in ['GET','HEAD']:
            for path in ['/service/model.py','/.venv/pyvenv.cfg','/assets/%2e%2e/service/model.py','/assets/']:
                self.assertEqual(self.request(method,path)[0],404,(method,path))
        self.assertEqual(self.request('GET','/index.html')[0],200)
    def test_untrusted_model_and_body_size(self):
        h={'Content-Type':'application/json','X-Entelloq-Token':TOKEN}
        for body in ['{"model":"anything"}','{"enzyme":NaN}','{"enzyme":true}',' '*4097]:
            self.assertEqual(self.request('POST','/api/simulate',body,h)[0],400)

if __name__=='__main__':unittest.main(verbosity=2)
