"""Export the standalone lockup with font outlines; the site keeps accessible HTML text.

Run from the repository root:
uv run --with fonttools --with brotli --with uharfbuzz python design/brand-v3/export-logo.py
"""
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.roundingPen import RoundingPen

ROOT = Path(__file__).resolve().parents[2]


def outline(text, font_file, weight, size, x, baseline, tracking=0):
    font = TTFont(ROOT / 'public/fonts' / font_file)
    font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
    font.flavor = None
    stream = BytesIO()
    font.save(stream)
    face = hb.Face(stream.getvalue())
    shaped_font = hb.Font(face)
    shaped_font.scale = (face.upem, face.upem)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(shaped_font, buf, {'kern': True})
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    scale = size / face.upem
    paths = []
    cursor = x
    for info, position in zip(buf.glyph_infos, buf.glyph_positions):
        pen = SVGPathPen(glyphs)
        glyphs[order[info.codepoint]].draw(RoundingPen(pen))
        data = pen.getCommands()
        if data:
            dx = cursor + position.x_offset * scale
            dy = baseline - position.y_offset * scale
            paths.append(f'<path transform="translate({dx:.3f} {dy:.3f}) scale({scale:.5f} {-scale:.5f})" d="{data}"/>')
        cursor += position.x_advance * scale + tracking
    return ''.join(paths), cursor - tracking


if __name__ == '__main__':
    mark = ET.parse(ROOT / 'public/brand/pirogorsk-symbol.svg').getroot()
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    mark_shapes = ''.join(ET.tostring(child, encoding='unicode') for child in mark)
    name, end = outline('Пирогорск', 'playfair-cyrillic.woff2', 800, 52, 108, 61, -2.86)
    tagline, tagline_end = outline('Пироги с балтийским характером', 'golos-cyrillic.woff2', 400, 13.3, 110, 84)
    width = round(max(end, tagline_end) + 8)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 100" role="img" aria-labelledby="title desc">
<title id="title">Пирогорск</title><desc id="desc">Пироги с балтийским характером. Знак: пирог, балтийский город и морская волна.</desc>
<g transform="translate(0 2)">{mark_shapes}</g><g fill="#113e50">{name}{tagline}</g></svg>'''
    dest = ROOT / 'public/brand/pirogorsk-logo.svg'
    dest.write_text(svg)
    print(f'{dest.relative_to(ROOT)}: {width}×100, {dest.stat().st_size} bytes')
