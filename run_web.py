"""Start the generated offline web app and open it in the default browser."""
import functools
import http.server
from pathlib import Path
import threading
import webbrowser


def main():
    app = Path(__file__).resolve().parent / 'deploy_unit20'
    if not (app / 'index.html').is_file():
        raise SystemExit('Missing deploy_unit20. Run npm run build first.')
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(app))
    with http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler) as server:
        url = f'http://127.0.0.1:{server.server_address[1]}/'
        print(f'UNIT-20: {url}\nKeep this window open. Ctrl+C to stop.')
        timer = threading.Timer(0.5, webbrowser.open, args=(url,))
        timer.daemon = True
        timer.start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nUNIT-20 stopped.')


if __name__ == '__main__':
    main()
