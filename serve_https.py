#!/usr/bin/env python3
import http.server
import socketserver
import ssl
import webbrowser
import os
import sys
import tempfile
from pathlib import Path

# Your HTML file
HTML_FILE = "main.html"

# Create a basic handler that always serves main.html
class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html", f"/{HTML_FILE}"):
            self.path = f"/{HTML_FILE}"
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

def run_server():
    # Make sure the file exists
    if not Path(HTML_FILE).exists():
        print(f"Error: {HTML_FILE} not found in current directory.")
        sys.exit(1)

    # Create temp self-signed cert if not already there
    certfile = Path(tempfile.gettempdir()) / "localhost.pem"
    if not certfile.exists():
        from subprocess import run
        print("Generating temporary self-signed certificate...")
        run([
            "openssl", "req", "-new", "-x509", "-days", "1",
            "-nodes", "-out", str(certfile), "-keyout", str(certfile),
            "-subj", "/CN=localhost"
        ], check=True)

    # Start server on a free port
    with socketserver.TCPServer(("", 0), MyHandler) as httpd:
        port = httpd.server_address[1]

        # Wrap socket with SSL
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

        url = f"https://localhost:{port}/{HTML_FILE}"
        print(f"Serving {HTML_FILE} at {url}")

        # Open in browser
        webbrowser.open(url, new=2)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
        finally:
            httpd.server_close()
            print("Server closed, port freed.")

if __name__ == "__main__":
    run_server()

