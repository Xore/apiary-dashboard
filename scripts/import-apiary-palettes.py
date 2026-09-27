#!/usr/bin/env python3
"""Import APIARY's nine palette themes into src/themes/neutral/apiaryPalettes.generated.ts.

Usage: scripts/import-apiary-palettes.py <path to the APIARY checkout>

Reads the vendored Xore/theme stylesheet in APIARY's dashboard (generated and
contrast-checked there) and writes every [data-hp-palette] block, light and
dark, as data the Astryx theme family maps onto its tokens.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

NAMES = ['claude', 'slate', 'sage', 'lavender', 'lime', 'amber', 'ocean', 'rose', 'neon']
CSS = 'arcane/home/honeypot-dashboard/frontend-next/public/static/theme.css'
OUT = Path(__file__).resolve().parent.parent / 'src/themes/neutral/apiaryPalettes.generated.ts'


def split_top(value: str) -> list[str]:
    depth, parts, cur = 0, [], ''
    for ch in value:
        depth += ch == '('
        depth -= ch == ')'
        if ch == ',' and depth == 0:
            parts.append(cur.strip())
            cur = ''
        else:
            cur += ch
    return [*parts, cur.strip()]


def main(apiary: Path) -> None:
    css = (apiary / CSS).read_text()
    sha = subprocess.run(['git', '-C', str(apiary), 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip() or 'unknown'
    palettes = {}
    for name in NAMES:
        block = re.search(r'/\* ([A-Z][a-z]+) — ([^*]*?) \*/\n[^{]*?\[data-hp-palette="%s"\] \{(.*?)\n\}' % name, css, re.S)
        if not block:
            sys.exit(f'palette {name} not found in {CSS}')
        light, dark = {}, {}
        for var, value in re.findall(r'--([a-z0-9-]+):\s*([^;]+);', block.group(3)):
            both = re.match(r'light-dark\((.*)\)$', value.strip())
            light[var], dark[var] = split_top(both.group(1)) if both else (value.strip(), value.strip())
        palettes[name] = {'description': block.group(2).strip(), 'light': light, 'dark': dark}
    OUT.write_text(
        f"""// Generated from Xore/APIARY's theme.css (the vendored Xore/theme build,
// APIARY {sha}): the nine palette themes, each a whole surface (ground,
// sidebar, surface ramp, borders, text ramp, accent family, status tones,
// terminal and shadows), light and dark. Regenerate with
// `scripts/import-apiary-palettes.py <APIARY checkout>`; do not edit by hand.

export const APIARY_PALETTES = {json.dumps(palettes, indent=2, ensure_ascii=False)} as const

export type ApiaryPalette = keyof typeof APIARY_PALETTES
"""
    )
    print(f'wrote {OUT.name} from APIARY {sha}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
