from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
PUBLIC.mkdir(exist_ok=True)

BLUE = (0, 85, 255, 255)
WHITE = (255, 255, 255, 255)
SLATE_950 = (15, 23, 42, 255)
SLATE_400 = (148, 163, 184, 255)


def draw_bridge_mark(draw: ImageDraw.ImageDraw, scale: float, ox: float, oy: float, color):
    def s(v: float) -> float:
        return v * scale

    stroke = max(1, int(round(s(2.8))))
    draw.rounded_rectangle((ox + s(5.5), oy + s(5.5), ox + s(26.5), oy + s(26.5)), radius=s(3.0), outline=color, width=stroke)
    draw.line((ox + s(9.5), oy + s(16), ox + s(22.5), oy + s(16)), fill=color, width=stroke)
    draw.line((ox + s(12.5), oy + s(12.6), ox + s(9.1), oy + s(16), ox + s(12.5), oy + s(19.4)), fill=color, width=stroke)
    draw.line((ox + s(19.5), oy + s(12.6), ox + s(22.9), oy + s(16), ox + s(19.5), oy + s(19.4)), fill=color, width=stroke)
    draw.ellipse((ox + s(14.1), oy + s(14.1), ox + s(17.9), oy + s(17.9)), fill=color)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BLUE)
    draw = ImageDraw.Draw(img)
    scale = size / 32
    draw_bridge_mark(draw, scale, 0, 0, WHITE)
    return img


def main():
    # favicon.ico (multi-size)
    icon16 = make_icon(16)
    icon32 = make_icon(32)
    icon48 = make_icon(48)
    icon32.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # apple touch icon
    apple = make_icon(180)
    apple.save(PUBLIC / "apple-touch-icon.png", format="PNG")

    # OG image
    w, h = 1200, 630
    og = Image.new("RGBA", (w, h), SLATE_950)
    draw = ImageDraw.Draw(og)

    # subtle radial-ish glow
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for r, a in [(460, 32), (380, 22), (300, 14), (220, 8)]:
        gdraw.ellipse((w // 2 - r, -r, w // 2 + r, r), fill=(0, 85, 255, a))
    og.alpha_composite(glow)

    mark = make_icon(120)
    og.alpha_composite(mark, dest=((w - 120) // 2, 120))

    try:
        font_title = ImageFont.truetype("arial.ttf", 72)
        font_sub = ImageFont.truetype("arial.ttf", 28)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    title = "PivLinks"
    subtitle = "THE GLOBAL FINANCIAL BRIDGE"
    tw = draw.textlength(title, font=font_title)
    sw = draw.textlength(subtitle, font=font_sub)
    draw.text(((w - tw) / 2, 300), title, fill=WHITE, font=font_title)
    draw.text(((w - sw) / 2, 375), subtitle, fill=SLATE_400, font=font_sub)

    og.convert("RGB").save(PUBLIC / "og-image.png", format="PNG")


if __name__ == "__main__":
    main()
