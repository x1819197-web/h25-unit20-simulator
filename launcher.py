"""H25 Gas Turbine SCADA Simulator — offline desktop app (UNIT-20).

Double-click H25-Simulator.exe: no internet needed, no browser needed.
Opens the 1:1 DIASYS Netmation replica (19 screens) in its own app window
(pywebview: Edge/WebView2 on Windows; falls back to Chrome/Edge --app).
Buttons: OCHISH (operator view) / TRENER (fault-injection panel).
Closing the app window stops the local server.
"""
import http.server
import functools
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

APP_DIR = (
    os.path.join(getattr(sys, "_MEIPASS", os.path.abspath(os.path.dirname(__file__))), "app")
    if getattr(sys, "frozen", False)
    else os.path.abspath(os.path.dirname(__file__))
)
PORT = 0  # 0 = auto
SERVER = None
BASE_URL = ""


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def start_server(port):
    global SERVER

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):  # noqa: D102
            pass

    handler = functools.partial(Quiet, directory=APP_DIR)
    SERVER = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
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


def open_browser_fallback(url):
    """Fallback when pywebview/WebView2 is unavailable (still fully offline)."""
    br = find_browser()
    try:
        if br:
            subprocess.Popen(
                [br, "--app=" + url, "--start-maximized"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            webbrowser.open(url)
    except Exception as e:  # noqa: BLE001
        messagebox.showerror("H25 Simulator", "Oyna ochilmadi:\n" + str(e))


def open_app(url):
    """Own offline app window (no address bar, no browser UI)."""
    if HAS_WEBVIEW:
        try:
            webview.create_window(
                "H25 GAS TURBINE GENERATOR — UNIT-20",
                url,
                maximized=True,
                resizable=True,
                text_select=False,
            )
            webview.start(debug=False)
            return
        except Exception:  # noqa: BLE001
            pass  # fall through to browser fallback below
    open_browser_fallback(url)


def main():
    global BASE_URL
    port = free_port()
    start_server(port)
    BASE_URL = "http://127.0.0.1:%d/index.html" % port

    root = tk.Tk()
    root.title("H25 Gas Turbine Simulator — UNIT-20")
    root.geometry("420x250")
    root.resizable(False, False)
    tk.Label(
        root,
        text="H25 GAS TURBINE GENERATOR — UNIT-20\nDIASYS Netmation simulyatori (19 ekran, 1:1)",
        justify="center",
        font=("Arial", 11, "bold"),
    ).pack(pady=10)
    tk.Label(
        root,
        text="Offline dastur: internet shart emas.\nNoutbukni oching → dasturni oching → ishlating.",
        justify="center",
        font=("Arial", 9),
    ).pack()
    btns = tk.Frame(root)
    btns.pack(pady=10)
    tk.Button(
        btns, text="OCHISH", width=12, font=("Arial", 11, "bold"),
        command=lambda: open_app(BASE_URL),
    ).grid(row=0, column=0, padx=5)
    tk.Button(
        btns, text="TRENER", width=12, font=("Arial", 11),
        command=lambda: open_app(BASE_URL + "?trainer=1"),
    ).grid(row=0, column=1, padx=5)
    tk.Label(
        root,
        text="Trener: vibratsiya / qizib ketish / moy / gaz nosozliklari.\nOyna yopilsa server to'xtaydi.",
        justify="center",
        font=("Arial", 9),
    ).pack(pady=5)

    root.mainloop()
    if SERVER:
        SERVER.shutdown()


if __name__ == "__main__":
    main()
