#!/usr/bin/env python3
"""Genera la versión CUADRADA (1080x1080) de Orvexia Repricer.
Para foto de perfil, post de Instagram/Facebook o avatar."""
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1080

BG_TOP = (11, 13, 28)
BG_MID = (8, 9, 26)
BG_BOT = (5, 9, 19)
CYAN = (94, 234, 212)
INDIGO = (129, 140, 248)
PURPLE = (168, 85, 247)
WHITE = (255, 255, 255)

F = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    return ImageFont.truetype(F + name, size)

f_kicker = font("DejaVuSansMono.ttf", 30)
f_h1     = font("DejaVuSans-Bold.ttf", 128)
f_sub    = font("DejaVuSans.ttf", 40)
f_tag    = font("DejaVuSans-Bold.ttf", 38)
f_url    = font("DejaVuSansMono.ttf", 32)
f_badge  = font("DejaVuSans-Bold.ttf", 28)

img = Image.new("RGB", (W, H), BG_MID)
px = img.load()

# Fondo: gradiente diagonal
for y in range(H):
    for x in range(W):
        t = (x / W * 0.5 + y / H * 0.5)
        if t < 0.5:
            k = t / 0.5
            c = tuple(int(BG_TOP[i] + (BG_MID[i] - BG_TOP[i]) * k) for i in range(3))
        else:
            k = (t - 0.5) / 0.5
            c = tuple(int(BG_MID[i] + (BG_BOT[i] - BG_MID[i]) * k) for i in range(3))
        px[x, y] = c

draw = ImageDraw.Draw(img, "RGBA")

# Rejilla cyber
step = 48
for x in range(0, W, step):
    draw.line([(x, 0), (x, H)], fill=(94, 234, 212, 12), width=1)
for y in range(0, H, step):
    draw.line([(0, y), (W, y)], fill=(94, 234, 212, 12), width=1)

# Halos
def glow(cx, cy, r, color, max_a):
    for rr in range(r, 0, -6):
        a = int(max_a * (1 - rr / r) ** 2)
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color + (a,))

glow(W // 2, 120, 420, INDIGO, 40)
glow(160, H - 140, 360, PURPLE, 28)
glow(W - 150, H - 120, 340, CYAN, 26)

CX = W // 2

def center(text, fnt):
    return CX - draw.textlength(text, font=fnt) / 2

def gradient_text_centered(y, text, fnt, c1, c2):
    bbox = fnt.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = int(CX - tw / 2)
    mask = Image.new("L", (tw + 4, th + 24), 0)
    md = ImageDraw.Draw(mask)
    md.text((-bbox[0] + 2, -bbox[1] + 4), text, font=fnt, fill=255)
    grad = Image.new("RGB", (tw + 4, th + 24))
    gp = grad.load()
    for gx in range(tw + 4):
        k = gx / max(tw, 1)
        col = tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))
        for gy in range(th + 24):
            gp[gx, gy] = col
    img.paste(grad, (x, y), mask)

# Kicker
draw.text((center("▸ ORVEXIA · OS", f_kicker), 210), "▸ ORVEXIA · OS",
          font=f_kicker, fill=(94, 234, 212, 220))

# Titular a dos líneas, centrado
draw.text((center("Orvexia", f_h1), 270), "Orvexia", font=f_h1, fill=WHITE)
gradient_text_centered(396, "Repricer", f_h1, CYAN, INDIGO)

# Subtítulo (dos líneas)
draw.text((center("Repricer automático para", f_sub), 580),
          "Repricer automático para", font=f_sub, fill=(255, 255, 255, 205))
draw.text((center("vendedores de Amazon España", f_sub), 632),
          "vendedores de Amazon España", font=f_sub, fill=(255, 255, 255, 205))

# Tagline
draw.text((center("Gana la Buy Box sin destrozar tu margen.", f_tag), 720),
          "Gana la Buy Box sin destrozar tu margen.", font=f_tag, fill=CYAN)

# Pill URL centrada
url = "orvexia.es/repricer"
uw = draw.textlength(url, font=f_url)
pad = 28
ux1 = int(CX - (uw + pad * 2) / 2)
uy = 800
draw.rounded_rectangle([ux1, uy, ux1 + uw + pad * 2, uy + 62], radius=16,
                       fill=(255, 255, 255, 18), outline=(94, 234, 212, 120), width=2)
draw.text((ux1 + pad, uy + 14), url, font=f_url, fill=(255, 255, 255, 235))

# Badge "14 días gratis" centrado abajo
bt = "14 DÍAS GRATIS"
bw = draw.textlength(bt, font=f_badge)
bx1 = int(CX - (bw + 70) / 2)
by = 905
draw.rounded_rectangle([bx1, by, bx1 + bw + 70, by + 54], radius=27,
                       fill=(16, 185, 129, 38), outline=(52, 211, 153, 180), width=2)
draw.ellipse([bx1 + 22, by + 21, bx1 + 34, by + 33], fill=(52, 211, 153, 255))
draw.text((bx1 + 46, by + 13), bt, font=f_badge, fill=(167, 243, 208, 255))

out = "orvexia-cuadrada.png"
img.save(out, "PNG")
print("OK ->", out, img.size)
