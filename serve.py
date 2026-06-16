import http.server, socketserver, sys

PORT = 3434
DIR  = "/Users/marcel/Library/Mobile Documents/com~apple~CloudDocs/Bestellapp"

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)
    def log_message(self, *a): pass

with socketserver.TCPServer(("", PORT), H) as s:
    sys.stdout.write(f"Serving on http://localhost:{PORT}\n")
    sys.stdout.flush()
    s.serve_forever()
