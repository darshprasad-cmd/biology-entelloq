"""Loopback-only fixed model API and optional local static preview."""
import argparse
import json
import secrets
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from model import simulate, te

TOKEN = secrets.token_urlsafe(32)
ROOT = Path(__file__).resolve().parents[1]

def allowed_origin(value):
    if not value:
        return True
    u = urlsplit(value)
    return value in ('https://biology.entelloq.com', 'https://www.biology.entelloq.com') or (u.scheme == 'http' and u.hostname in ('127.0.0.1', 'localhost') and not u.username and not u.password and u.path == '')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def check(self):
        host = self.headers.get('Host', '')
        if host not in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
            self.send_error(403, 'Invalid Host')
            return False
        if not allowed_origin(self.headers.get('Origin')):
            self.send_error(403, 'Origin not allowed')
            return False
        return True

    def end_headers(self):
        origin = self.headers.get('Origin')
        if origin and allowed_origin(origin):
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def json(self, data, status=200):
        body = json.dumps(data, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_OPTIONS(self):
        if not self.check(): return
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Entelloq-Token')
        if self.headers.get('Access-Control-Request-Private-Network') == 'true':
            self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()

    def do_GET(self):
        if not self.check(): return
        if self.path == '/api/health':
            return self.json({'ok':True, 'engine':'Tellurium', 'version':te.__version__, 'token':TOKEN})
        # Preview serves only built public assets, never the Python environment or repository.
        if not self.static_allowed(): return self.json({'error':'Not found'}, 404)
        super().do_GET()

    def static_allowed(self):
        path = unquote(urlsplit(self.path).path)
        public = path in ('/', '/index.html') or path.startswith(('/dist/', '/assets/'))
        resolved = (ROOT / (path.lstrip('/') or 'index.html')).resolve()
        return public and resolved.is_relative_to(ROOT) and '..' not in path and resolved.is_file()

    def do_HEAD(self):
        if not self.check(): return
        if not self.static_allowed(): return self.send_error(404)
        super().do_HEAD()

    def do_POST(self):
        if not self.check(): return
        if self.path != '/api/simulate': return self.json({'error':'Not found'}, 404)
        if not secrets.compare_digest(self.headers.get('X-Entelloq-Token', ''), TOKEN):
            return self.json({'error':'Connect to the local companion first'}, 403)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096 or self.headers.get_content_type() != 'application/json':
                return self.json({'error':'Expected a small JSON request'}, 400)
            result = simulate(json.loads(self.rfile.read(length)))
            self.json(result)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self.json({'error':str(exc)}, 400)
        except Exception:
            self.json({'error':'The scientific engine could not complete this run'}, 500)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8932)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Biology companion: http://127.0.0.1:{args.port} · Tellurium {te.__version__}', flush=True)
    server.serve_forever()
