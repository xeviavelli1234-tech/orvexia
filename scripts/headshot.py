#!/usr/bin/env python3
"""Convierte una selfie en una foto de perfil profesional para Orvexia:
quita el fondo, lo sustituye por uno oscuro con halo neón de marca,
encuadra en headshot cuadrado y ajusta luz/color."""
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
from rembg import remove, new_session

INPUT = sys.argv[1] if len(sys.argv) > 1 else \
    "/root/.claude/uploads/1f012737-c1d3-5dfc-9925-cd63dd16fd9d/e98caaae-1000029970.jpg"
OUT = "orvexia-foto-perfil.png"

CYAN = (94, 234, 212)
INDIGO = (129, 140, 248)

# ── 1. Quitar fondo ──────────────────────────────────────────────────────
src = Image.open(INPUT).convert("RGBA")
session = new_session("u2net")
cut = remove(src, session=session)  # RGBA, fondo transparente

# ── 2. Realce de la persona (luz, contraste, color, nitidez) ─────────────
r, g, b, a = cut.split()
rgb = Image.merge("RGB", (r, g, b))
rgb = ImageEnhance.Brightness(rgb).enhance(1.07)
rgb = ImageEnhance.Contrast(rgb).enhance(1.09)
rgb = ImageEnhance.Color(rgb).enhance(1.10)
rgb = ImageEnhance.Sharpness(rgb).enhance(1.18)
r2, g2, b2 = rgb.split()
cut = Image.merge("RGBA", (r2, g2, b2, a))

# Suavizar un pelín el borde del recorte para que no quede "pegado"
a_blur = a.filter(ImageFilter.GaussianBlur(0.8))
cut.putalpha(a_blur)

# ── 3. Localizar la cabeza para encuadrar el headshot ────────────────────
arr = np.array(a)
ys, xs = np.where(arr > 40)
head_top = int(ys.min())
H = src.height
band = (ys >= head_top) & (ys <= head_top + int(0.30 * H))
head_cx = int(xs[band].mean())
head_left, head_right = int(xs[band].min()), int(xs[band].max())
head_w = head_right - head_left

side = int(head_w * 2.8)                 # cabeza + hombros con más margen
left = int(head_cx - side / 2)
top = int(head_top - 0.24 * side)        # más aire sobre el pelo

# ── 4. Fondo profesional: gradiente oscuro + halo neón + viñeta ──────────
def make_bg(w, h, glow_xy):
    bg = Image.new("RGB", (w, h))
    px = bg.load()
    top_c, bot_c = (18, 20, 32), (6, 8, 18)
    for y in range(h):
        k = y / h
        c = tuple(int(top_c[i] + (bot_c[i] - top_c[i]) * k) for i in range(3))
        for x in range(w):
            px[x, y] = c
    # Halo neón suave (una elipse difuminada, sin "anillo")
    glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    gx, gy = glow_xy
    gr = int(w * 0.34)
    col = tuple(int((INDIGO[i] + CYAN[i]) / 2) for i in range(3))
    gd.ellipse([gx - gr, gy - gr, gx + gr, gy + gr], fill=col + (120,))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(w * 0.16))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow_layer).convert("RGB")
    # Viñeta sutil para enfocar el centro
    vig = Image.new("L", (w, h), 0)
    dv = ImageDraw.Draw(vig)
    dv.ellipse([-w * 0.2, -h * 0.2, w * 1.2, h * 1.2], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(w * 0.16))
    dark = Image.new("RGB", (w, h), (4, 5, 12))
    bg = Image.composite(bg, dark, vig)
    return bg.convert("RGBA")

# Halo detrás de la cabeza/hombros
glow = (head_cx - left, head_top - top + int(side * 0.42))
bg = make_bg(side, side, glow)

# ── 5. Componer persona sobre el fondo y exportar ────────────────────────
person_sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
person_sq.paste(cut, (-left, -top), cut)
comp = bg.copy()
comp.alpha_composite(person_sq)

comp = comp.resize((1000, 1000), Image.LANCZOS).convert("RGB")
comp.save(OUT, "PNG")
print("OK ->", OUT, comp.size)
