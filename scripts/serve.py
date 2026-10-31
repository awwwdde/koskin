"""Run Next.js and Python inside the platform's single application container."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("PORT", "8080")
os.environ.setdefault("HOSTNAME", "0.0.0.0")
os.environ.setdefault("NODE_ENV", "production")
children = []
stopping = False

def shutdown(signum=None, frame=None):
    global stopping
    stopping = True
    for child in children:
        if child.poll() is None:
            child.terminate()

signal.signal(signal.SIGTERM, shutdown)
signal.signal(signal.SIGINT, shutdown)
try:
    children.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8100", "--proxy-headers"], cwd=ROOT))
    children.append(subprocess.Popen(["node", "server.js"], cwd=ROOT))
    exit_code = 0
    while not stopping:
        for child in children:
            if child.poll() is not None:
                exit_code = child.returncode or 1
                shutdown()
                break
        time.sleep(.3)
finally:
    shutdown()
    for child in children:
        try:
            child.wait(timeout=8)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
sys.exit(exit_code)
