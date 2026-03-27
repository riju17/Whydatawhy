import os
import socket
import sys
import threading
import time
import traceback
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


def _wait_for_server(url: str, timeout_sec: int = 120) -> bool:
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


def _run_streamlit(app_path: Path, port: int, error_holder: dict) -> None:
    try:
        from streamlit.web import bootstrap

        flags = {
            "server.headless": True,
            "server.port": port,
            "browser.gatherUsageStats": False,
            "server.fileWatcherType": "none",
        }
        bootstrap.run(str(app_path), False, [], flags)
    except Exception:
        error_holder["traceback"] = traceback.format_exc()


def _show_error_message(message: str) -> None:
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("Cricket Dashboard Error", message)
        root.destroy()
    except Exception:
        pass


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
    os.environ["STREAMLIT_SERVER_HEADLESS"] = "true"
    os.environ["STREAMLIT_SERVER_FILE_WATCHER_TYPE"] = "none"

    port = _find_free_port()
    health_url = f"http://127.0.0.1:{port}/_stcore/health"
    app_url = f"http://127.0.0.1:{port}"
    error_holder: dict = {}

    streamlit_thread = threading.Thread(
        target=_run_streamlit,
        args=(app_path, port, error_holder),
        daemon=True,
    )
    streamlit_thread.start()

    if not _wait_for_server(health_url):
        details = error_holder.get("traceback", "")
        log_path = Path.home() / "CricketDashboard_error.log"
        with log_path.open("w", encoding="utf-8") as f:
            if details:
                f.write(details)
            else:
                f.write("Streamlit server failed to start within timeout.\n")
                f.write("No Python traceback captured from launcher thread.\n")
        message = (
            "Streamlit server failed to start.\n\n"
            f"Details saved to:\n{log_path}\n\n"
            "Please share this file for diagnosis."
        )
        _show_error_message(message)
        raise RuntimeError(message)

    try:
        _start_desktop_window(app_url)
    finally:
        os._exit(0)


if __name__ == "__main__":
    main()
