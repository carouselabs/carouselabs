"""Generate placeholder toolbar icons for the CarouseLabs Comment extension.

Same approach as browser-extension-ideas/ (a solid CarouseLabs-purple square
with a simple white glyph, Pillow-rendered at each required size) but with a
chat-bubble glyph instead of a lightbulb, so the two extensions are visually
distinguishable in the toolbar. Swap icons/icon*.png for real brand assets
whenever they're ready; same file names, so no manifest changes needed.
"""

from pathlib import Path

from PIL import Image, ImageDraw

PURPLE = (124, 58, 237, 255)  # CarouseLabs #7C3AED
WHITE = (255, 255, 255, 255)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"
SIZES = (16, 48, 128)


def draw_chat_bubble(size: int) -> Image.Image:
    # Render at 4x and downsample for clean anti-aliased edges at small sizes.
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    corner_radius = round(canvas_size * 0.22)
    draw.rounded_rectangle(
        [(0, 0), (canvas_size - 1, canvas_size - 1)],
        radius=corner_radius,
        fill=PURPLE,
    )

    margin = canvas_size * 0.24
    bubble_bottom = canvas_size * 0.66
    bubble_box = [margin, canvas_size * 0.2, canvas_size - margin, bubble_bottom]
    bubble_radius = round(canvas_size * 0.14)
    draw.rounded_rectangle(bubble_box, radius=bubble_radius, fill=WHITE)

    tail_w = canvas_size * 0.14
    tail_left = canvas_size * 0.34
    draw.polygon(
        [
            (tail_left, bubble_bottom - canvas_size * 0.02),
            (tail_left + tail_w, bubble_bottom - canvas_size * 0.02),
            (tail_left, bubble_bottom + canvas_size * 0.14),
        ],
        fill=WHITE,
    )

    dot_y = (bubble_box[1] + bubble_box[3]) / 2
    dot_r = canvas_size * 0.035
    spacing = canvas_size * 0.14
    center_x = canvas_size / 2
    for offset in (-spacing, 0, spacing):
        cx = center_x + offset
        draw.ellipse(
            [cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r],
            fill=PURPLE,
        )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        icon = draw_chat_bubble(size)
        out_path = OUT_DIR / f"icon{size}.png"
        icon.save(out_path)
        print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
