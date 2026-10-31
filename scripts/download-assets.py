"""Download the original site's public images. No stock image is presented as an authored work."""
from pathlib import Path
import urllib.request

ASSETS = {
    "roman.png": "https://static.tildacdn.pub/tila3936-3065-4331-b634-356138653464/5048bab1-5fd4-4266-8.png",
    "posters.jpg": "https://static.tildacdn.pub/tila3536-3136-4336-b462-383262313935/photo-1535446937720-.jpg",
    "branding.jpg": "https://static.tildacdn.pub/tila3962-3238-4234-a333-663963343333/photo-1590102426275-.jpg",
    "architecture.jpg": "https://static.tildacdn.pub/tila3735-3130-4635-a465-326333346335/photo-1721244654392-.jpg",
    "interior.jpg": "https://static.tildacdn.pub/tila3936-6538-4838-a136-333937333930/photo-1606744824163-.jpg",
    "barber.jpg": "https://static.tildacdn.pub/tila3935-6434-4437-b366-333435303439/photo-1771865600306-.jpg",
}
if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "public" / "images"
    target.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for name, url in ASSETS.items():
        data = opener.open(url, timeout=40).read()
        (target / name).write_bytes(data)
        print(f"{name}: {len(data)} bytes")
