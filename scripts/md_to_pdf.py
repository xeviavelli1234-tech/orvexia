#!/usr/bin/env python3
"""Convierte docs/plan-captacion-clientes.md a PDF con fpdf2 (fuentes Unicode)."""
import re
from fpdf import FPDF

SRC = "docs/plan-captacion-clientes.md"
OUT = "Orvexia-plan-captacion-30-dias.pdf"

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
BRAND = (79, 70, 229)      # indigo
DARK = (17, 20, 32)
GREY = (90, 95, 110)
RULE = (220, 222, 230)

# ── Limpieza de emojis (DejaVu no los tiene) manteniendo →, ▸, €, acentos ──
def clean(s: str) -> str:
    s = s.replace("️", "")
    out = []
    for ch in s:
        o = ord(ch)
        if 0x1F000 <= o <= 0x1FFFF:      # emoji
            continue
        if 0x2600 <= o <= 0x27BF:        # símbolos/dingbats (☀ ⚠ ✅ 🎯…)
            continue
        out.append(ch)
    return "".join(out).strip()

def strip_inline(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)   # negritas → texto plano (celdas)
    s = s.replace("`", "")
    return clean(s)


class PDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-12)
        self.set_font("D", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 8, f"Orvexia · Plan de captación  ·  pág. {self.page_no()}", align="C")


pdf = PDF(format="A4")
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_font("D", "", FONT_DIR + "DejaVuSans.ttf")
pdf.add_font("D", "B", FONT_DIR + "DejaVuSans-Bold.ttf")
pdf.add_font("M", "", FONT_DIR + "DejaVuSansMono.ttf")
pdf.add_page()
pdf.set_margins(18, 16, 18)

EPW = pdf.epw  # ancho útil


def h(text, size, color, top=4, bottom=2):
    pdf.ln(top)
    pdf.set_font("D", "B", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(EPW, size * 0.5, clean(text))
    pdf.ln(bottom)


def para(text):
    pdf.set_font("D", "", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(EPW, 5.2, clean(text), markdown=True)
    pdf.ln(1)


def bullet(text, ordered=None):
    pdf.set_font("D", "", 10)
    pdf.set_text_color(*DARK)
    marker = f"{ordered}. " if ordered else "•  "
    x = pdf.get_x()
    pdf.set_x(x + 4)
    pdf.multi_cell(EPW - 4, 5.2, marker + clean(text), markdown=True)


def hr():
    pdf.ln(2)
    pdf.set_draw_color(*RULE)
    pdf.set_line_width(0.3)
    y = pdf.get_y()
    pdf.line(18, y, 18 + EPW, y)
    pdf.ln(3)


def quote(text):
    pdf.set_font("D", "", 9.5)
    pdf.set_text_color(*BRAND)
    pdf.set_x(pdf.get_x() + 3)
    pdf.multi_cell(EPW - 3, 5, clean(text), markdown=True)
    pdf.ln(1)


def render_table(rows):
    pdf.ln(1)
    pdf.set_font("D", "", 8.5)
    pdf.set_text_color(*DARK)
    with pdf.table(
        borders_layout="MINIMAL",
        cell_fill_color=(243, 244, 250),
        cell_fill_mode="ROWS",
        line_height=5,
        text_align="LEFT",
    ) as table:
        for r in rows:
            row = table.row()
            for c in r:
                row.cell(strip_inline(c))
    pdf.ln(2)


def render_code(lines):
    pdf.ln(1)
    pdf.set_font("M", "", 8)
    pdf.set_text_color(*GREY)
    pdf.set_fill_color(245, 246, 250)
    pdf.multi_cell(EPW, 4.3, clean("\n".join(lines)), fill=True)
    pdf.ln(2)


# ── Parser línea a línea ───────────────────────────────────────────────────
with open(SRC, encoding="utf-8") as f:
    lines = f.read().split("\n")

i = 0
table_buf = []
code_buf = []
in_code = False

def flush_table():
    global table_buf
    if not table_buf:
        return
    rows = []
    for ln in table_buf:
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):  # fila separadora
            continue
        rows.append(cells)
    if rows:
        render_table(rows)
    table_buf = []

while i < len(lines):
    line = lines[i]
    stripped = line.strip()

    if stripped.startswith("```"):
        if in_code:
            render_code(code_buf)
            code_buf = []
            in_code = False
        else:
            in_code = True
        i += 1
        continue
    if in_code:
        code_buf.append(line)
        i += 1
        continue

    if stripped.startswith("|") and stripped.endswith("|"):
        table_buf.append(stripped)
        i += 1
        continue
    else:
        flush_table()

    if stripped == "":
        i += 1
        continue
    if stripped.startswith("# "):
        h(stripped[2:], 19, BRAND, top=2, bottom=3)
    elif stripped.startswith("## "):
        hr()
        h(stripped[3:], 14, DARK, top=0, bottom=2)
    elif stripped.startswith("### "):
        h(stripped[4:], 11.5, BRAND, top=3, bottom=1)
    elif stripped.startswith("> "):
        quote(stripped[2:])
    elif re.match(r"^[-*] ", stripped):
        bullet(stripped[2:])
    elif re.match(r"^\d+\. ", stripped):
        num = stripped.split(".", 1)[0]
        bullet(stripped.split(". ", 1)[1], ordered=num)
    elif set(stripped) <= set("-") and len(stripped) >= 3:
        hr()
    else:
        para(stripped)
    i += 1

flush_table()
pdf.output(OUT)
print("OK ->", OUT)
