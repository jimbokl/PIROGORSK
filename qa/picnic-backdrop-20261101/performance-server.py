"""Serve the old published HTML and new build with the same local assets."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

root = Path(__file__).resolve().parents[2]
baseline = Path(__file__).with_name('before-product.html')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root / 'site'), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == '/catalog/baltiyskiy-piknik-set/' and parse_qs(url.query).get('before') == ['1']:
            html = baseline.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            self.wfile.write(html)
        else:
            super().do_GET()

    def log_message(self, *args):
        pass

ThreadingHTTPServer(('127.0.0.1', 4323), Handler).serve_forever()
