"""Exploratory vector concepts, not production assets.

uv run --with fonttools --with brotli --with uharfbuzz python design/brand-v5/build-concepts.py
"""
from io import BytesIO
from math import cos, sin, pi
from pathlib import Path
import sys

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.roundingPen import RoundingPen

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ROUND = sys.argv[1] if len(sys.argv) > 1 else 'v1'


def outline(text, face, weight, size, x, baseline, tracking=0):
    font = instantiateVariableFont(TTFont(ROOT / 'public/fonts' / f'{face}-cyrillic.woff2'), {'wght': weight}, inplace=True)
    font.flavor = None
    stream = BytesIO()
    font.save(stream)
    hb_face = hb.Face(stream.getvalue())
    hb_font = hb.Font(hb_face)
    hb_font.scale = (hb_face.upem, hb_face.upem)
    buffer = hb.Buffer()
    buffer.add_str(text)
    buffer.guess_segment_properties()
    hb.shape(hb_font, buffer, {'kern': True})
    glyphs = font.getGlyphSet()
    order = font.getGlyphOrder()
    scale = size / hb_face.upem
    paths = []
    cursor = x
    for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions):
        pen = SVGPathPen(glyphs)
        glyphs[order[info.codepoint]].draw(RoundingPen(pen))
        d = pen.getCommands()
        if d:
            paths.append(f'<path transform="translate({cursor + pos.x_offset * scale:.3f} {baseline - pos.y_offset * scale:.3f}) scale({scale:.5f} {-scale:.5f})" d="{d}"/>')
        cursor += pos.x_advance * scale + tracking
    return ''.join(paths), cursor - tracking


def svg(shapes, width=256, height=256, title='Пирогорск'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" fill="#111111" role="img" aria-label="{title}"><title>{title}</title>{shapes}</svg>\n'


def crimped_circle():
    # Eight gentle scallops, cubic interpolation of one continuous polar contour.
    steps = 32
    def point(t):
        r = 101 + 7 * cos(8 * t)
        dr = -56 * sin(8 * t)
        return (128 + r * cos(t), 128 + r * sin(t), dr * cos(t) - r * sin(t), dr * sin(t) + r * cos(t))
    start = point(-pi / 2)
    d = f'M{start[0]:.3f} {start[1]:.3f}'
    for i in range(steps):
        t = -pi / 2 + i * 2 * pi / steps
        a, b = point(t), point(t + 2 * pi / steps)
        h = 2 * pi / steps / 3
        d += f'C{a[0]+h*a[2]:.3f} {a[1]+h*a[3]:.3f} {b[0]-h*b[2]:.3f} {b[1]-h*b[3]:.3f} {b[0]:.3f} {b[1]:.3f}'
    return d + 'Z'


arch = '<path d="M40 224V112a88 88 0 0 1 176 0v112h-48V116a40 40 0 0 0-80 0v108Z"/>'
wave = '<path d="M86 176c28-22 56 22 84 0v24c-28 22-56-22-84 0Z"/>'
pie_slots = ('M116 78c0-8 12-8 12 0 0 18 24 18 24 40 0 8-12 8-12 0 0-16-24-18-24-40Z'
             'M72 114c0-8 12-8 12 0 0 18 24 18 24 40 0 8-12 8-12 0 0-16-24-18-24-40Z'
             'M148 114c0-8 12-8 12 0 0 18 24 18 24 40 0 8-12 8-12 0 0-16-24-18-24-40Z')
pie = f'<path fill-rule="evenodd" d="{crimped_circle()}{pie_slots}"/>'
pinched_p = '<path d="M40 224V68c0-30 40-42 58-18 14-32 46-32 60 0 18-24 58-12 58 18v156h-44V100H84v124Z"/>'

if ROUND in ('v2', 'v3'):
    # Detach the sea from the gate: no accidental A crossbar in the counter.
    arch = '<path d="M40 180V112a88 88 0 0 1 176 0v68h-44v-64a44 44 0 0 0-88 0v64Z"/>'
    wave = '<path d="M40 210c30-22 58-22 88-7s58 15 88-7v24c-30 22-58 22-88 7s-58-15-88 7Z"/>'
    pie_slots = ('M118 66c0-9 16-9 16 0 0 19 16 23 16 46 0 9-16 9-16 0 0-19-16-23-16-46Z'
                 'M72 110c0-9 16-9 16 0 0 19 16 23 16 46 0 9-16 9-16 0 0-19-16-23-16-46Z'
                 'M158 110c0-9 16-9 16 0 0 19 16 23 16 46 0 9-16 9-16 0 0-19-16-23-16-46Z')
    pie = f'<path fill-rule="evenodd" d="{crimped_circle()}{pie_slots}"/>'
    # Slightly wider counter and a calmer, less cartoonish pinched edge.
    pinched_p = '<path d="M40 224V64c0-22 32-32 56-14 16-24 48-24 64 0 24-18 56-8 56 14v160h-44V96H84v128Z"/>'

symbols = {'a': arch + wave, 'b': pie, 'c': pinched_p}
names = {'a': 'Печь у моря', 'b': 'Пирог-солнце', 'c': 'Мягкая буква'}
for key, shapes in symbols.items():
    (HERE / f'concept-{key}-{ROUND}.svg').write_text(svg(shapes, title=f'Пирогорск — {names[key]}'))

# Custom initial, followed by outlined Cyrillic. No live font dependency.
initial_a = '<path d="M288 178v-9h11V83h-11V72h119v11h-11v86h11v9h-46v-9h11v-65c0-15-9-22-25-22s-23 7-23 22v65h11v9Z"/>'
rest_a, end_a = outline('ирогорск', 'playfair', 720, 143, 409, 178, -2.6)
tag_a, _ = outline('ПИРОГИ С БАЛТИЙСКИМ ХАРАКТЕРОМ', 'golos', 450, 22 if ROUND in ('v2', 'v3') else 17, 291, 216, 1.3)
word_b, end_b = outline('ПИРОГОРСК', 'golos', 560, 116, 292, 165, 2)
tag_b, _ = outline('Пироги с балтийским характером', 'playfair', 500, 28, 295, 210, .1)
initial_c = f'<g transform="translate(270 68) scale(.5)">{pinched_p}</g>' if ROUND in ('v2', 'v3') else f'<g transform="translate(269 27) scale(.68)">{pinched_p}</g>'
rest_c, end_c = outline('ирогорск', 'golos', 760, 149, 382 if ROUND in ('v2', 'v3') else 417, 180, -3)
tag_c, _ = outline('ПИРОГИ С БАЛТИЙСКИМ ХАРАКТЕРОМ', 'golos', 450, 22 if ROUND in ('v2', 'v3') else 17, 291, 216, 1.3)
if ROUND == 'v3':
    # The tagline cannot be read in a compact header. Keep the identifier alone.
    tag_a = tag_b = tag_c = ''
lockups = {'a': (initial_a + rest_a + tag_a, end_a), 'b': (word_b + tag_b, end_b), 'c': (initial_c + rest_c + tag_c, end_c)}
for key, (wordmark, end) in lockups.items():
    (HERE / f'concept-{key}-lockup-{ROUND}.svg').write_text(svg(symbols[key] + wordmark, round(end + 16), 256, f'Пирогорск — {names[key]}'))
print(f'Built three {ROUND} symbols and outlined lockups in {HERE.relative_to(ROOT)}')
