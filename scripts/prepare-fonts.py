"""Recreate the checked-in WOFF2 subsets. Requires fonttools[woff]."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root = Path(__file__).resolve().parent.parent
for family, package in [('golos', 'golos-text'), ('playfair', 'playfair-display')]:
    for script in ['cyrillic', 'latin']:
        source = root / f'node_modules/@fontsource-variable/{package}/files/{package}-{script}-wght-normal.woff2'
        font = TTFont(source, lazy=False)
        font['gvar'].ensureDecompiled()
        options = subset.Options()
        options.flavor = 'woff2'
        options.desubroutinize = True
        sub = subset.Subsetter(options=options)
        ranges = 'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116' if script == 'cyrillic' else 'U+0020-0040,U+005B-0060,U+007B-007E,U+00A0,U+00AB,U+00BB,U+00D7,U+00F7,U+2010-2014,U+2018-201D,U+2026,U+202F,U+20BD'
        if script == 'latin' and family == 'golos':
            ranges += ',U+0061-007A'
        sub.populate(unicodes=subset.parse_unicodes(ranges))
        sub.subset(font)
        font = instantiateVariableFont(font, {'wght': (400, 700)}, inplace=True)
        target = root / f'public/fonts/{family}-{script}.woff2'
        font.flavor = 'woff2'
        font.save(target)
        print(f'{target.name}: {source.stat().st_size} → {target.stat().st_size} bytes')
