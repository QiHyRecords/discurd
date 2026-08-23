from pathlib import Path
from PIL import Image

root = Path("/home/ubuntu/luma-link/assets/images")
source = root / "icon.png"
image = Image.open(source).convert("RGB")
image.thumbnail((512, 512), Image.Resampling.LANCZOS)

for name in ("icon.png", "splash-icon.png", "favicon.png", "android-icon-foreground.png"):
    output = root / name
    image.save(output, format="PNG", optimize=True, compress_level=9)
