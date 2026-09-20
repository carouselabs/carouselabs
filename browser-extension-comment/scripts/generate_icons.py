"""Generate toolbar icons for the CarouseLabs Comment extension.

Same approach as browser-extension-ideas/ (a solid CarouseLabs-purple square
with a simple white glyph, Pillow-rendered at each required size), but the
glyph is a chat bubble with a pen stroke through it. That distinguishes it
from three things at once, which matters because all three can sit in the same
toolbar: the Ideas Board extension's lightbulb, the main app icon, and a plain
chat bubble (which reads as "messages", not "write a comment").

The earlier version drew three dots inside the bubble. At 16px those blur into
a grey smudge and say "chat" rather than "compose", so they are replaced by a
single bold diagonal nib stroke, which survives downsampling.

Swap icons/icon*.png for real brand assets whenever they're ready; same file
names, so no manifest changes needed.
"""

from pathlib import Path

from PIL import Image, ImageDraw

PURPLE = (124, 58, 237, 255)  # CarouseLabs #7C3AED
WHITE = (255, 255, 255, 255)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SIZES = (16, 48, 128)


def draw_comment_pen(size: int) -> Image.Image:
    # Render at 8x and downsample: the diagonal nib stroke aliases badly at
    # 16px without a generous supersample.
    scale = 8
    c = size * scale
    img = Image.new("RGBA", (c, c), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded purple tile.
    draw.rounded_rectangle([(0, 0), (c - 1, c - 1)], radius=round(c * 0.22), fill=PURPLE)

    # White speech bubble.
    margin = c * 0.19
    bubble_top = c * 0.18
    bubble_bottom = c * 0.64
    draw.rounded_rectangle(
        [margin, bubble_top, c - margin, bubble_bottom],
        radius=round(c * 0.15),
        fill=WHITE,
    )

    # Tail, angled down-left from the bubble's lower edge.
    draw.polygon(
        [
            (c * 0.30, bubble_bottom - c * 0.02),
            (c * 0.46, bubble_bottom - c * 0.02),
            (c * 0.28, bubble_bottom + c * 0.16),
        ],
        fill=WHITE,
    )

    # Pen stroke cut out of the bubble in purple: a thick diagonal shaft
    # running lower-left to upper-right, with a triangular nib at the low end.
    # Drawn as a filled quad rather than a line so the width stays exact
    # after downsampling.
    x0, y0 = c * 0.34, c * 0.52   # nib end
    x1, y1 = c * 0.66, c * 0.27   # tail end
    w = c * 0.085                 # perpendicular half-width

    dx, dy = x1 - x0, y1 - y0
    length = (dx * dx + dy * dy) ** 0.5
    px, py = -dy / length * w, dx / length * w  # unit normal * half-width

    draw.polygon(
        [(x0 + px, y0 + py), (x1 + px, y1 + py), (x1 - px, y1 - py), (x0 - px, y0 - py)],
        fill=PURPLE,
    )

    # Nib: a small triangle continuing past the shaft's low end.
    tip_x, tip_y = c * 0.27, c * 0.58
    draw.polygon([(x0 + px, y0 + py), (x0 - px, y0 - py), (tip_x, tip_y)], fill=PURPLE)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        icon = draw_comment_pen(size)
        out_path = OUT_DIR / f"icon{size}.png"
        icon.save(out_path)
        print(f"wrote {out_path} ({size}x{size})")


if __name__ == "__main__":
    main()
