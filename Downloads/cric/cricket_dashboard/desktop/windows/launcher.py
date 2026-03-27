import os
import socket
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request
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


def _start_streamlit_subprocess(app_path: Path, port: int) -> subprocess.Popen:
    env = os.environ.copy()
    env["STREAMLIT_BROWSER_GATHER_USAGE_STATS"] = "false"
    env["STREAMLIT_SERVER_HEADLESS"] = "true"
    env["STREAMLIT_SERVER_FILE_WATCHER_TYPE"] = "none"
    env["PYTHONUNBUFFERED"] = "1"

    return subprocess.Popen(
        [
            sys.executable,
            "-m",
            "streamlit",
            "run",
            str(app_path),
            "--server.port",
            str(port),
            "--server.address",
            "127.0.0.1",
            "--server.headless",
            "true",
            "--browser.gatherUsageStats",
            "false",
            "--server.fileWatcherType",
            "none",
        ],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )


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

        webview.create_window(
            "Cricket Statistics Dashboard",
            url=url,
            width=1440,
            height=920,
            min_size=(1100, 700),
        )
        webview.start()
    except Exception:
        details = traceback.format_exc()
        message = (
            "Desktop window could not start.\n\n"
            "Install Microsoft Edge WebView2 Runtime and try again.\n"
            "https://developer.microsoft.com/microsoft-edge/webview2/\n\n"
            f"Details:\n{details}"
        )
        _show_error_message(message)
        raise RuntimeError(message)


def main() -> None:
    app_path = _get_app_path()
    if not app_path.exists():
        raise FileNotFoundError(f"app.py not found at {app_path}")

    port = _find_free_port()
    health_url = f"http://127.0.0.1:{port}/_stcore/health"
    app_url = f"http://127.0.0.1:{port}"
    streamlit_proc = _start_streamlit_subprocess(app_path, port)

    if not _wait_for_server(health_url):
        details = ""
        try:
            out, _ = streamlit_proc.communicate(timeout=2)
            details = out or ""
        except Exception:
            details = ""
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
        try:
            streamlit_proc.terminate()
            streamlit_proc.wait(timeout=5)
        except Exception:
            try:
                streamlit_proc.kill()
            except Exception:
                pass
        os._exit(0)


if __name__ == "__main__":
    main()
