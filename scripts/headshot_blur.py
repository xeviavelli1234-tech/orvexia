#!/usr/bin/env python3
"""Versión "modo retrato": mantiene el fondo ORIGINAL pero desenfocado,
para que el desorden no se note y la cara quede nítida."""
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from rembg import remove, new_session

INPUT = sys.argv[1] if len(sys.argv) > 1 else \
    "/root/.claude/uploads/1f012737-c1d3-5dfc-9925-cd63dd16fd9d/e98caaae-1000029970.jpg"
OUT = "orvexia-foto-perfil-fondo.png"

src = Image.open(INPUT).convert("RGBA")
W, Hh = src.size

# ── 1. Recorte de la persona ─────────────────────────────────────────────
session = new_session("u2net")
cut = remove(src, session=session)

# Realce de la persona
r, g, b, a = cut.split()
rgb = Image.merge("RGB", (r, g, b))
rgb = ImageEnhance.Brightness(rgb).enhance(1.07)
rgb = ImageEnhance.Contrast(rgb).enhance(1.09)
rgb = ImageEnhance.Color(rgb).enhance(1.10)
rgb = ImageEnhance.Sharpness(rgb).enhance(1.18)
r2, g2, b2 = rgb.split()
cut = Image.merge("RGBA", (r2, g2, b2, a.filter(ImageFilter.GaussianBlur(0.8))))

# ── 2. Fondo = original DESENFOCADO (oculta el desorden) ─────────────────
bg = src.convert("RGB")
bg = ImageEnhance.Brightness(bg).enhance(1.04)
bg = bg.filter(ImageFilter.GaussianBlur(W * 0.035))   # bokeh fuerte
bg = bg.convert("RGBA")

comp = bg.copy()
comp.alpha_composite(cut)

# ── 3. Encuadre headshot cuadrado (cara + hombros) ───────────────────────
arr = np.array(a)
ys, xs = np.where(arr > 40)
head_top = int(ys.min())
band = (ys >= head_top) & (ys <= head_top + int(0.30 * Hh))
head_cx = int(xs[band].mean())
head_w = int(xs[band].max() - xs[band].min())

side = int(head_w * 2.8)
left = int(head_cx - side / 2)
top = int(head_top - 0.24 * side)

out_sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
out_sq.paste(comp, (-left, -top))
# Si el recuadro se sale de la imagen, rellena con el fondo desenfocado
bg_fill = bg.resize((side, side), Image.LANCZOS)
base = bg_fill.copy()
base.alpha_composite(out_sq)

base = base.resize((1000, 1000), Image.LANCZOS).convert("RGB")
base.save(OUT, "PNG")
print("OK ->", OUT, base.size)
