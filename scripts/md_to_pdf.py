#!/usr/bin/env python3
"""Convierte docs/plan-captacion-clientes.md a PDF con fpdf2 (fuentes Unicode)."""
import re
from fpdf import FPDF
from fpdf.enums import XPos, YPos

SRC = "docs/plan-captacion-clientes.md"
OUT = "Orvexia-plan-captacion-30-dias.pdf"

FONT_DIR = "/usr/share/fonts/truetype/dejavu/"
BRAND = (79, 70, 229)
DARK = (24, 27, 38)
GREY = (95, 100, 115)
RULE = (224, 226, 234)

# multi_cell que SIEMPRE continúa en la línea siguiente al margen izquierdo
NL = dict(new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def clean(s: str) -> str:
    s = s.replace("️", "")
    out = []
    for ch in s:
        o = ord(ch)
        if 0x1F000 <= o <= 0x1FFFF:
            continue
        if 0x2600 <= o <= 0x27BF:
            continue
        out.append(ch)
    return "".join(out).strip()


def strip_inline(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = s.replace("`", "")
    return clean(s)


class PDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("D", "", 8)
        self.set_text_color(*GREY)
        self.cell(0, 8, f"Orvexia · Plan de captación   ·   pág. {self.page_no()}",
                  align="C", new_x=XPos.LMARGIN, new_y=YPos.TOP)


pdf = PDF(format="A4")
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_font("D", "", FONT_DIR + "DejaVuSans.ttf")
pdf.add_font("D", "B", FONT_DIR + "DejaVuSans-Bold.ttf")
pdf.add_font("M", "", FONT_DIR + "DejaVuSansMono.ttf")
pdf.set_margins(18, 16, 18)
pdf.add_page()
EPW = pdf.epw


def h(text, size, color, top, bottom):
    if pdf.get_y() + top > pdf.h - 30:
        pdf.add_page()
    pdf.ln(top)
    pdf.set_font("D", "B", size)
    pdf.set_text_color(*color)
    pdf.multi_cell(EPW, size * 0.46, clean(text), **NL)
    pdf.ln(bottom)


def para(text):
    pdf.set_font("D", "", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(EPW, 5.2, clean(text), markdown=True, **NL)
    pdf.ln(1.2)


def bullet(text, ordered=None):
    pdf.set_font("D", "", 10)
    pdf.set_text_color(*DARK)
    marker = f"{ordered}.  " if ordered else "•   "
    pdf.set_x(pdf.l_margin + 3)
    pdf.multi_cell(EPW - 3, 5.2, marker + clean(text), markdown=True, **NL)
    pdf.ln(0.6)


def quote(text):
    pdf.ln(0.5)
    pdf.set_font("D", "", 9.5)
    pdf.set_text_color(*BRAND)
    pdf.set_x(pdf.l_margin + 3)
    pdf.multi_cell(EPW - 3, 5, clean(text), markdown=True, **NL)
    pdf.ln(1.2)


def hr():
    pdf.ln(1.5)
    pdf.set_draw_color(*RULE)
    pdf.set_line_width(0.3)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.l_margin + EPW, y)
    pdf.ln(2.5)


def render_table(rows):
    pdf.ln(1)
    pdf.set_font("D", "", 8.5)
    pdf.set_text_color(*DARK)
    with pdf.table(
        borders_layout="MINIMAL",
        cell_fill_color=(244, 245, 251),
        cell_fill_mode="ROWS",
        line_height=4.8,
        text_align="LEFT",
        padding=1.6,
    ) as table:
        for r in rows:
            row = table.row()
            for c in r:
                row.cell(strip_inline(c))
    pdf.ln(2.5)


def render_code(lines):
    pdf.ln(1)
    pdf.set_font("M", "", 8)
    pdf.set_text_color(*GREY)
    pdf.set_fill_color(245, 246, 250)
    pdf.multi_cell(EPW, 4.4, clean("\n".join(lines)), fill=True, **NL)
    pdf.ln(2.5)


with open(SRC, encoding="utf-8") as f:
    lines = f.read().split("\n")

table_buf, code_buf, in_code = [], [], False


def flush_table():
    global table_buf
    if not table_buf:
        return
    rows = []
    for ln in table_buf:
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):
            continue
        rows.append(cells)
    if rows:
        render_table(rows)
    table_buf = []


i = 0
while i < len(lines):
    line = lines[i]
    s = line.strip()

    if s.startswith("```"):
        if in_code:
            render_code(code_buf); code_buf = []; in_code = False
        else:
            in_code = True
        i += 1; continue
    if in_code:
        code_buf.append(line); i += 1; continue

    if s.startswith("|") and s.endswith("|"):
        table_buf.append(s); i += 1; continue
    else:
        flush_table()

    if s == "":
        i += 1; continue
    if s.startswith("# "):
        h(s[2:], 18, BRAND, top=1, bottom=3)
    elif s.startswith("## "):
        hr(); h(s[3:], 13.5, DARK, top=0, bottom=2)
    elif s.startswith("### "):
        h(s[4:], 11.5, BRAND, top=3, bottom=1)
    elif s.startswith("> "):
        quote(s[2:])
    elif re.match(r"^[-*] ", s):
        bullet(s[2:])
    elif re.match(r"^\d+\. ", s):
        num, rest = s.split(". ", 1)
        bullet(rest, ordered=num)
    elif set(s) <= set("-") and len(s) >= 3:
        hr()
    else:
        para(s)
    i += 1

flush_table()
pdf.output(OUT)
print("OK ->", OUT)
