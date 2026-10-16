import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_logo():
    width, height = 512, 512
    img = Image.new("RGBA", (width, height), (6, 10, 20, 255))
    draw = ImageDraw.Draw(img)

    # 1. Background subtle radial cyber glow
    center_x, center_y = width // 2, height // 2 - 20
    for r in range(220, 50, -5):
        alpha = int(45 * (1 - r / 220))
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=(6, 182, 212, alpha)
        )

    # 2. Outer Shield polygon coordinates
    def get_shield_points(scale=1.0, offset_y=0):
        # Base points for high-tech shield
        pts = [
            (center_x, center_y - int(150 * scale) + offset_y),
            (center_x + int(130 * scale), center_y - int(100 * scale) + offset_y),
            (center_x + int(120 * scale), center_y + int(40 * scale) + offset_y),
            (center_x + int(60 * scale), center_y + int(120 * scale) + offset_y),
            (center_x, center_y + int(160 * scale) + offset_y),
            (center_x - int(60 * scale), center_y + int(120 * scale) + offset_y),
            (center_x - int(120 * scale), center_y + int(40 * scale) + offset_y),
            (center_x - int(130 * scale), center_y - int(100 * scale) + offset_y),
        ]
        return pts

    # Shield Glow Layer
    glow_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.polygon(get_shield_points(1.05), outline=(6, 182, 212, 180), width=12)
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(8))
    img.alpha_composite(glow_img)

    # Outer Shield Border
    draw.polygon(get_shield_points(1.0), fill=(10, 20, 42, 240), outline=(6, 182, 212, 255), width=6)

    # Inner Shield Border
    draw.polygon(get_shield_points(0.82), fill=(14, 28, 58, 255), outline=(16, 185, 129, 230), width=4)

    # Core Security Hexagon
    hex_r = 50
    hex_pts = []
    for i in range(6):
        angle_deg = 60 * i - 30
        angle_rad = math.pi / 180 * angle_deg
        hex_pts.append((center_x + hex_r * math.cos(angle_rad), center_y + hex_r * math.sin(angle_rad)))
    draw.polygon(hex_pts, fill=(6, 182, 212, 60), outline=(6, 182, 212, 255), width=4)

    # Crosshair / Radar Reticle lines
    draw.line([center_x - 65, center_y, center_x + 65, center_y], fill=(16, 185, 129, 220), width=3)
    draw.line([center_x, center_y - 65, center_x, center_y + 65], fill=(16, 185, 129, 220), width=3)
    draw.ellipse([center_x - 22, center_y - 22, center_x + 22, center_y + 22], outline=(6, 182, 212, 255), width=4)
    draw.ellipse([center_x - 6, center_y - 6, center_x + 6, center_y + 6], fill=(16, 185, 129, 255))

    # Circuit traces radiating from shield
    trace_color = (6, 182, 212, 160)
    draw.line([center_x - 100, center_y - 20, center_x - 140, center_y - 20], fill=trace_color, width=3)
    draw.ellipse([center_x - 144, center_y - 24, center_x - 136, center_y - 16], fill=trace_color)
    draw.line([center_x + 100, center_y - 20, center_x + 140, center_y - 20], fill=trace_color, width=3)
    draw.ellipse([center_x + 136, center_y - 24, center_x + 144, center_y - 16], fill=trace_color)

    # Bottom Branding Box
    brand_y = height - 90
    draw.rounded_rectangle([center_x - 160, brand_y, center_x + 160, brand_y + 44], radius=14, fill=(8, 14, 28, 240), outline=(6, 182, 212, 180), width=2)

    # Text rendering
    try:
        font = ImageFont.truetype("arialbd.ttf", 22)
        sub_font = ImageFont.truetype("arial.ttf", 10)
    except:
        font = ImageFont.load_default()
        sub_font = font

    text = "AGENTSECSCAN"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text((center_x - tw // 2, brand_y + 6), text, fill=(255, 255, 255, 255), font=font)

    sub_text = "GENLAYER AUTONOMOUS AUDIT COURT"
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    stw = sub_bbox[2] - sub_bbox[0]
    draw.text((center_x - stw // 2, brand_y + 28), sub_text, fill=(6, 182, 212, 230), font=sub_font)

    # Save to root as logo.png
    out_path = "logo.png"
    img.save(out_path, "PNG")
    print(f"[OK] Logo generated successfully at {out_path} (512x512 PNG)")

if __name__ == "__main__":
    create_logo()
