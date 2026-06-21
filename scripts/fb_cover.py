#!/usr/bin/env python3
"""Genera la portada de Facebook de Orvexia Repricer (PNG)."""
import math
from PIL import Image, ImageDraw, ImageFont

W, H = 1640, 624  # 2x de la portada FB (851x315), para nitidez

# ── Paleta de marca (de las tarjetas del repricer) ──────────────────────
BG_TOP = (11, 13, 28)      # #0b0d1c
BG_MID = (8, 9, 26)        # #08091a
BG_BOT = (5, 9, 19)        # #050913
CYAN = (94, 234, 212)      # #5EEAD4
INDIGO = (129, 140, 248)   # #818CF8
PURPLE = (168, 85, 247)    # #A855F7
WHITE = (255, 255, 255)

F = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    return ImageFont.truetype(F + name, size)

f_kicker = font("DejaVuSansMono.ttf", 24)
f_h1     = font("DejaVuSans-Bold.ttf", 78)
f_sub    = font("DejaVuSans.ttf", 34)
f_tag    = font("DejaVuSans-Bold.ttf", 30)
f_url    = font("DejaVuSansMono.ttf", 27)
f_badge  = font("DejaVuSans-Bold.ttf", 24)

img = Image.new("RGB", (W, H), BG_MID)
px = img.load()

# ── Fondo: gradiente diagonal ───────────────────────────────────────────
for y in range(H):
    for x in range(0, W, 2):  # paso 2 px (suficiente, más rápido)
        t = (x / W * 0.5 + y / H * 0.5)
        if t < 0.5:
            k = t / 0.5
            c = tuple(int(BG_TOP[i] + (BG_MID[i] - BG_TOP[i]) * k) for i in range(3))
        else:
            k = (t - 0.5) / 0.5
            c = tuple(int(BG_MID[i] + (BG_BOT[i] - BG_MID[i]) * k) for i in range(3))
        px[x, y] = c
        if x + 1 < W:
            px[x + 1, y] = c

draw = ImageDraw.Draw(img, "RGBA")

# ── Rejilla cyber tenue ─────────────────────────────────────────────────
step = 48
for x in range(0, W, step):
    draw.line([(x, 0), (x, H)], fill=(94, 234, 212, 12), width=1)
for y in range(0, H, step):
    draw.line([(0, y), (W, y)], fill=(94, 234, 212, 12), width=1)

# ── Halos de luz radiales (glow) ────────────────────────────────────────
def glow(cx, cy, r, color, max_a):
    for rr in range(r, 0, -6):
        a = int(max_a * (1 - rr / r) ** 2)
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))

glow(W - 230, 150, 360, INDIGO, 46)
glow(1180, H - 60, 320, CYAN, 30)
glow(300, 120, 300, PURPLE, 26)

# ── Texto con gradiente horizontal (para "Repricer") ────────────────────
def gradient_text(draw_img, xy, text, fnt, c1, c2):
    bbox = fnt.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    mask = Image.new("L", (tw + 4, th + 20), 0)
    md = ImageDraw.Draw(mask)
    md.text((-bbox[0] + 2, -bbox[1] + 4), text, font=fnt, fill=255)
    grad = Image.new("RGB", (tw + 4, th + 20))
    gp = grad.load()
    for gx in range(tw + 4):
        k = gx / max(tw, 1)
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))
        for gy in range(th + 20):
            gp[gx, gy] = col
    draw_img.paste(grad, (xy[0], xy[1]), mask)
    return tw

# Márgenes: dejamos limpia la esquina inferior-izquierda (foto de perfil FB).
# Contenido más centrado horizontalmente para sobrevivir al recorte de móvil.
LEFT = 120
TOP = 120

# Kicker
draw.text((LEFT, TOP), "▸ ORVEXIA · OS", font=f_kicker, fill=(94, 234, 212, 220))

# Titular: "Orvexia " (blanco) + "Repricer" (gradiente neón)
y1 = TOP + 42
w_a = draw.textlength("Orvexia ", font=f_h1)
draw.text((LEFT, y1), "Orvexia ", font=f_h1, fill=WHITE)
gradient_text(img, (LEFT + int(w_a), y1 + 6), "Repricer", f_h1, CYAN, INDIGO)

# Subtítulo
y2 = y1 + 98
draw.text((LEFT, y2), "Repricer automático para vendedores de Amazon España",
          font=f_sub, fill=(255, 255, 255, 205))

# Tagline (cian)
y3 = y2 + 50
draw.text((LEFT, y3), "Gana la Buy Box sin destrozar tu margen.",
          font=f_tag, fill=CYAN)

# Pill de URL
y4 = y3 + 56
url = "orvexia.es/repricer"
uw = draw.textlength(url, font=f_url)
pad = 24
draw.rounded_rectangle([LEFT, y4, LEFT + uw + pad * 2, y4 + 56], radius=14,
                       fill=(255, 255, 255, 18), outline=(94, 234, 212, 120), width=2)
draw.text((LEFT + pad, y4 + 12), url, font=f_url, fill=(255, 255, 255, 235))

# Badge "14 días gratis" (arriba a la derecha, fuera del recorte móvil central
# pero visible en escritorio)
bt = "14 DÍAS GRATIS"
bw = draw.textlength(bt, font=f_badge)
bx2 = W - 90
bx1 = bx2 - bw - 44
by1 = 92
draw.rounded_rectangle([bx1, by1, bx2, by1 + 50], radius=25,
                       fill=(16, 185, 129, 38), outline=(52, 211, 153, 180), width=2)
draw.ellipse([bx1 + 18, by1 + 19, bx1 + 30, by1 + 31], fill=(52, 211, 153, 255))
draw.text((bx1 + 40, by1 + 12), bt, font=f_badge, fill=(167, 243, 208, 255))

out = "orvexia-portada-facebook.png"
img.save(out, "PNG")
print("OK ->", out, img.size)
