"""Portable UNIT-20 desktop host. Serves ONLY the generated native artifact.
Build web assets first: npm run build. Windows packaging: build_unit20.bat.
"""
import functools
import http.server
import os
from pathlib import Path
import sys
import threading
import webbrowser


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    base = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
    app = base / 'app' if getattr(sys, 'frozen', False) else base / 'deploy_unit20'
    if not (app / 'index.html').is_file():
        raise SystemExit('Missing generated artifact. Run npm run build first.')
    handler = functools.partial(QuietHandler, directory=str(app))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_address[1]}/index.html'
    try:
        try:
            import webview
            origin = url.rsplit('/', 1)[0]
            webview.create_window('H25 · UNIT-20', origin + '/h25/index.html?link=1',
                                  width=1100, height=800, resizable=True, min_size=(900, 650))
            webview.create_window('KU-20 · UNIT-20', origin + '/ku/index.html',
                                  width=1000, height=800, resizable=True, min_size=(800, 600))
            webview.start(debug=False)
        except Exception as error:
            # Keep the server alive while fallback browser windows are in use.
            import tkinter as tk
            webbrowser.open(url)
            root = tk.Tk()
            root.title('UNIT-20 local server')
            root.geometry('520x210')
            tk.Label(root, text='UNIT-20 is open in your browser.\nKeep this window open while training.',
                     font=('Arial', 11), pady=15).pack()
            tk.Label(root, text=url, font=('Arial', 10)).pack()
            tk.Label(root, text='WebView fallback: ' + str(error)[:150], wraplength=490,
                     fg='#805000').pack(pady=10)
            tk.Button(root, text='Stop server and close', command=root.destroy).pack()
            root.mainloop()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


if __name__ == '__main__':
    main()
