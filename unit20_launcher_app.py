"""UNIT-20 offline desktop app: H25 gaz turbina + KU-20 qozon BIR exe ichida.

Double-click UNIT20-Simulator.exe: internet shart emas, brauzer shart emas.
Bitta lokal portda ikkala simulyatsiya BIR origin da ochiladi, shuning uchun
BroadcastChannel('unit20') + localStorage (h25_live / ku20_live) jonli ishlaydi:
  /h25/index.html?link=1  -> H25 gaz turbina (19 ekran, 1:1 DIASYS)
  /ku/index.html          -> KU-20 qozon (PL3009/PL3010, rasm 1:1)
Oyna (pywebview: Edge/WebView2; bo'lmasa Chrome/Edge --app).
Menyu: H25 OCHISH / QOZON OCHISH / IKKALASI (2 oyna).
App yopilsa server to'xtaydi. Qayta yig'ish: build_unit20.bat ni ishga tushiring.
"""

import http.server
import os
import socket
import subprocess
import sys
import threading
import webbrowser
import tkinter as tk
from tkinter import messagebox

try:
    import webview  # offline app window (no browser chrome)
    HAS_WEBVIEW = True
except Exception:  # noqa: BLE001
    HAS_WEBVIEW = False

# Windowed PyInstaller exe has no stdout/stderr -> http.server would crash
# logging each request (connection closed without response). Suppress.
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

if getattr(sys, "frozen", False):
    APP_DIR = os.path.join(getattr(sys, "_MEIPASS", os.path.abspath(os.path.dirname(__file__))), "app")
else:
    APP_DIR = os.path.abspath(os.path.dirname(__file__))
H25_DIR = os.path.join(APP_DIR, "h25") if getattr(sys, "frozen", False) else os.path.abspath(os.path.dirname(__file__))
KU_FROZEN = os.path.join(APP_DIR, "ku")
KU_DEV = r"D:\qozon\simulyatsiya"
KU_DIR = KU_FROZEN if getattr(sys, "frozen", False) else KU_DEV

PORT = 0  # 0 = auto
SERVER = None
BASE_URL = ""


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class U20(http.server.SimpleHTTPRequestHandler):
    """Bitta origin: /h25/* -> H25, /ku/* -> KU-20 qozon."""

    def log_message(self, *args):  # noqa: D102
        pass

    def do_GET(self):  # noqa: D102
        if self.path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"""<html><body style="font-family:Arial;background:#111;color:#eee;padding:40px">"""
                b"""<h2>UNIT-20: H25 gaz turbina + KU-20 qozon (bir agregat)</h2>"""
                b"""<p><a style="color:#7dff7d;font-size:20px" href="/h25/index.html?link=1">H25 UNIT-20 (DIASYS)</a></p>"""
                b"""<p><a style="color:#7dff7d;font-size:20px" href="/ku/index.html">KU-20 qozon PL3009/PL3010</a></p>"""
                b"""<p>Jonli bog: BroadcastChannel('unit20') + localStorage h25_live/ku20_live (bir origin).</p>"""
                b"""</body></html>"""
            )
            return
        if self.path.startswith("/h25/"):
            self.path = self.path[4:] or "/index.html"
            self.directory = H25_DIR
        elif self.path.startswith("/ku/"):
            self.path = self.path[3:] or "/index.html"
            self.directory = KU_DIR
        else:
            self.directory = H25_DIR
        return http.server.SimpleHTTPRequestHandler.do_GET(self)


def start_server(port):
    global SERVER
    SERVER = http.server.ThreadingHTTPServer(("127.0.0.1", port), U20)
    SERVER.daemon_threads = True
    threading.Thread(target=SERVER.serve_forever, daemon=True).start()


def find_browser():
    for c in [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]:
        if os.path.exists(c):
            return c
    return None


def open_windows(urls_titles):
    """Offline app oynalari (adres panelisiz). urls_titles = [(url, title), ...]."""
    if HAS_WEBVIEW:
        try:
            for url, title in urls_titles:
                webview.create_window(title, url, maximized=True, resizable=True, text_select=False)
            webview.start(debug=False)
            return
        except Exception:  # noqa: BLE001
            pass  # fall through to browser fallback below
    br = find_browser()
    try:
        for url, _ in urls_titles:
            if br:
                subprocess.Popen(
                    [br, "--app=" + url, "--start-maximized"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                webbrowser.open(url)
    except Exception as e:  # noqa: BLE001
        messagebox.showerror("UNIT-20 Simulator", "Oyna ochilmadi:\n" + str(e))


def main():
    global BASE_URL
    port = free_port()
    start_server(port)
    BASE_URL = "http://127.0.0.1:%d" % port
    h25_url = BASE_URL + "/h25/index.html?link=1"
    ku_url = BASE_URL + "/ku/index.html"

    root = tk.Tk()
    root.title("UNIT-20: H25 + KU-20 (offline)")
    root.geometry("520x340")
    root.resizable(False, False)
    tk.Label(
        root,
        text="UNIT-20 — H25 gaz turbina + KU-20 qozon\nBITTA agregat, JONLI bog'langan (offline)",
        justify="center",
        font=("Arial", 12, "bold"),
    ).pack(pady=10)
    tk.Label(
        root,
        text="Bitta portda: /h25/ + /ku/ bir origin ->\nBroadcastChannel + localStorage jonli ishlaydi.\nInternet shart emas.",
        justify="center",
        font=("Arial", 9),
    ).pack()
    f = tk.Frame(root)
    f.pack(pady=10)
    tk.Button(
        f, text="H25 OCHISH", width=14, font=("Arial", 11, "bold"),
        command=lambda: open_windows([(h25_url, "H25 GAS TURBINE GENERATOR — UNIT-20")]),
    ).grid(row=0, column=0, padx=5)
    tk.Button(
        f, text="QOZON OCHISH", width=14, font=("Arial", 11, "bold"),
        command=lambda: open_windows([(ku_url, "KU-20 QOZON PL3009/PL3010 — UNIT-20")]),
    ).grid(row=0, column=1, padx=5)
    tk.Button(
        root, text="IKKALASI (2 oyna)", width=30, font=("Arial", 10),
        command=lambda: open_windows([
            (h25_url, "H25 GAS TURBINE GENERATOR — UNIT-20"),
            (ku_url, "KU-20 QOZON PL3009/PL3010 — UNIT-20"),
        ]),
    ).pack(pady=4)
    tk.Label(
        root,
        text="Qozonda H25 TEST tugmasi ham bor (simulyatorsiz tekshirish).\nAvariyada ikkala oyna ovoz chiqaradi. Oyna yopilsa server to'xtaydi.",
        justify="center",
        font=("Arial", 9),
    ).pack(pady=6)
    tk.Label(root, text=BASE_URL, font=("Courier", 9), fg="blue").pack()

    root.mainloop()
    if SERVER:
        SERVER.shutdown()


if __name__ == "__main__":
    if not os.path.isdir(H25_DIR):
        messagebox.showerror("UNIT-20", "Topilmadi: " + H25_DIR)
    elif not os.path.isdir(KU_DIR):
        messagebox.showerror("UNIT-20", "Topilmadi: " + KU_DIR)
    else:
        main()
