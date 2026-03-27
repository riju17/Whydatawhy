import os
import socket
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path


def _get_app_path() -> Path:
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        return Path(sys._MEIPASS) / "app.py"
    return Path(__file__).resolve().parents[2] / "app.py"


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return int(s.getsockname()[1])


def _wait_for_server(url: str, timeout_sec: int = 45) -> bool:
    end = time.time() + timeout_sec
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(0.4)
    return False


def _run_streamlit(app_path: Path, port: int) -> None:
    from streamlit.web import bootstrap

    flags = {
        "server.headless": True,
        "server.port": port,
        "browser.gatherUsageStats": False,
        "server.fileWatcherType": "none",
    }
    bootstrap.run(str(app_path), False, [], flags)


def _start_desktop_window(url: str) -> None:
    try:
        import webview

        window = webview.create_window(
            "Cricket Statistics Dashboard",
            url=url,
            width=1440,
            height=920,
            min_size=(1100, 700),
        )
        webview.start()
    except Exception:
        webbrowser.open(url)
        try:
            import tkinter as tk

            root = tk.Tk()
            root.title("Cricket Dashboard")
            root.geometry("420x140")
            root.resizable(False, False)
            label = tk.Label(
                root,
                text=f"Dashboard is running at:\n{url}\n\nKeep this window open.",
                justify="center",
                padx=12,
                pady=16,
            )
            label.pack(fill="both", expand=True)
            root.mainloop()
        except Exception:
            while True:
                time.sleep(1)


def main() -> None:
    app_path = _get_app_path()
    if not app_path.exists():
        raise FileNotFoundError(f"app.py not found at {app_path}")

    os.environ["STREAMLIT_BROWSER_GATHER_USAGE_STATS"] = "false"
    port = _find_free_port()
    health_url = f"http://127.0.0.1:{port}/_stcore/health"
    app_url = f"http://127.0.0.1:{port}"

    streamlit_thread = threading.Thread(
        target=_run_streamlit,
        args=(app_path, port),
        daemon=True,
    )
    streamlit_thread.start()

    if not _wait_for_server(health_url):
        raise RuntimeError("Streamlit server failed to start")

    try:
        _start_desktop_window(app_url)
    finally:
        os._exit(0)


if __name__ == "__main__":
    main()
