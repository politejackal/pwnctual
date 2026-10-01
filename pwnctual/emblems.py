"""Legendary rank emblems, built as layered SVG.

Each rank adds ornaments as you climb, like a competitive ranked ladder:
Noob medallion -> Shadow winged shield -> Demon horns -> Reaper scythes -> Ghost crown and halo.
All coordinates are in a 200x200 frame.
"""
import itertools

_uid = itertools.count()
INK = "#170B24"

BODIES = {
    "medallion": "M100 48 C129 48 150 70 150 100 C150 130 129 152 100 152 C71 152 50 130 50 100 C50 70 71 48 100 48 Z",
    "shield": "M100 42 C118 52 134 54 150 50 L150 100 C150 130 130 152 100 166 C70 152 50 130 50 100 L50 50 C66 54 82 52 100 42 Z",
    "gem": "M100 40 L150 66 L150 132 L100 162 L50 132 L50 66 Z",
    "crest": "M100 36 L118 50 L152 45 L150 102 C150 132 128 154 100 168 C72 154 50 132 50 102 L48 45 L82 50 Z",
}

STYLE = {
    #          body         spikes wings scythes horns crown rays  aura
    "noob":   ("medallion", False, 0,    False,  False, False, False, False),
    "shadow": ("shield",    True,  .7,   False,  False, False, False, True),
    "demon":  ("crest",     False, 0,    False,  True,  False, False, True),
    "reaper": ("crest",     False, .9,   True,   False, False, False, True),
    "ghost":  ("crest",     False, 1.0,  False,  False, True,  True,  True),
}

WING = ("M58 80 C42 62 24 52 6 54 C12 60 16 64 18 70 C11 70 7 73 4 78 C13 80 19 84 22 90 "
        "C16 92 12 96 11 102 C22 102 32 104 42 110 C38 114 36 118 36 124 C44 120 52 118 58 118 Z")
WING_LINES = "M46 76 C36 70 26 68 18 70 M46 90 C38 88 30 88 22 90 M48 104 C40 102 32 102 24 104"

SKULL = """
<path d="M60 34 C47 34 38 43 38 55 C38 62 41 67 46 70 L46 76 C46 78 47.5 79.5 49.5 79.5 L70.5 79.5
 C72.5 79.5 74 78 74 76 L74 70 C79 67 82 62 82 55 C82 43 73 34 60 34 Z" fill="url(#{u}bone)" stroke="{ink}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M46 47 C49 41 54 38.5 60 38.5" stroke="#FFFFFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>
<path d="M43.5 55 C43.5 50 49 48.5 54 51.5 C56.5 53 56.5 58 53 60.5 C49 63 43.5 60.5 43.5 55 Z" fill="{ink}"/>
<path d="M76.5 55 C76.5 50 71 48.5 66 51.5 C63.5 53 63.5 58 67 60.5 C71 63 76.5 60.5 76.5 55 Z" fill="{ink}"/>
{eyes}
<path d="M60 61.5 L57 67.5 Q60 69 63 67.5 Z" fill="{ink}"/>
<path d="M54 72 V79 M58 72.5 V79.5 M62 72.5 V79.5 M66 72 V79" stroke="{ink}" stroke-width="1.8" stroke-linecap="round"/>
"""

EYES = """
<g filter="url(#{u}glow)"><ellipse cx="50.5" cy="56" rx="3.6" ry="3" fill="{c}"/><ellipse cx="69.5" cy="56" rx="3.6" ry="3" fill="{c}"/></g>
<ellipse cx="50.5" cy="56" rx="2" ry="1.7" fill="#FFFFFF"/><ellipse cx="69.5" cy="56" rx="2" ry="1.7" fill="#FFFFFF"/>
"""


def _mirror(markup):
    return f'{markup}<g transform="translate(200 0) scale(-1 1)">{markup}</g>'


def emblem(tier, size=96, animate=True):
    u = f"e{next(_uid)}"
    key = tier["key"]
    hi, mid, lo, glow = tier["hi"], tier["mid"], tier["lo"], tier["glow"]
    body_kind, spikes, wings, scythes, horns, crown, rays, aura = STYLE[key]
    body = BODIES[body_kind]
    ghost = key == "ghost"

    # ---------------------------------------------------------------- defs
    metal_stops = f'<stop offset="0" stop-color="{hi}"/><stop offset=".48" stop-color="{mid}"/><stop offset="1" stop-color="{lo}"/>'
    if ghost and animate:
        metal_stops = f"""<stop offset="0" stop-color="#FFFFFF"/>
<stop offset=".45" stop-color="#BEE7FF"><animate attributeName="stop-color" values="#BEE7FF;#FFD1F4;#C9FFE9;#BEE7FF" dur="6s" repeatCount="indefinite"/></stop>
<stop offset="1" stop-color="#5B6CFF"><animate attributeName="stop-color" values="#5B6CFF;#B04DFF;#1FB5C9;#5B6CFF" dur="6s" repeatCount="indefinite"/></stop>"""
    bone_top, bone_bot = ("#FFFFFF", "#CFEFFF") if ghost else ("#FFFCF2", "#E2D3B6")
    defs = f"""<defs>
<linearGradient id="{u}m" x1="0" y1="0" x2=".35" y2="1">{metal_stops}</linearGradient>
<radialGradient id="{u}p" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="{mid}" stop-opacity=".55"/><stop offset="1" stop-color="{INK}" stop-opacity=".9"/></radialGradient>
<linearGradient id="{u}bone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{bone_top}"/><stop offset="1" stop-color="{bone_bot}"/></linearGradient>
<linearGradient id="{u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7C2"/><stop offset=".5" stop-color="#FFC93C"/><stop offset="1" stop-color="#A85A00"/></linearGradient>
<linearGradient id="{u}steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C3CCDA"/><stop offset="1" stop-color="#5D6A80"/></linearGradient>
<radialGradient id="{u}ray" cx="100" cy="100" r="96" gradientUnits="userSpaceOnUse"><stop offset=".35" stop-color="#FFFFFF"/><stop offset="1" stop-color="{glow or hi}" stop-opacity="0"/></radialGradient>
<clipPath id="{u}c"><path d="{body}"/></clipPath>
<filter id="{u}glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="{u}aura" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
</defs>"""

    back, front = [], []

    # ---------------------------------------------------------------- behind the body
    if aura and glow:
        back.append(f'<circle cx="100" cy="100" r="{62 if not ghost else 74}" fill="{glow}" opacity="{.35 if not ghost else .55}" filter="url(#{u}aura)"/>')
    if rays:
        ray = "".join(
            f'<path d="M100 100 L{100 - (5 if i % 2 else 8)} 8 L{100 + (5 if i % 2 else 8)} 8 Z" transform="rotate({i * 22.5} 100 100)" '
            f'opacity="{.55 if i % 2 else .85}"/>' for i in range(16))
        spin = ('<animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="30s" repeatCount="indefinite"/>'
                if animate else "")
        back.append(f'<g fill="url(#{u}ray)"><g>{spin}{ray}</g></g>')
    if scythes:
        handle = (f'<path d="M48 176 L146 40" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>'
                  f'<path d="M48 176 L146 40" stroke="#6B4226" stroke-width="5.5" stroke-linecap="round"/>'
                  f'<path d="M146 40 C162 22 186 24 198 46 C184 38 168 42 158 54 Z" fill="url(#{u}steel)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')
        back.append(_mirror(handle))
    if horns:
        horn = (f'<path d="M66 56 C44 50 30 32 36 8 C44 28 58 36 80 44 Z" fill="url(#{u}bone)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                f'<path d="M50 40 L58 36 M44 28 L52 25" stroke="{INK}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>')
        back.append(_mirror(horn))
    if wings:
        w = (f'<g transform="translate(58 100) scale({wings}) translate(-58 -100)">'
             f'<path d="{WING}" fill="url(#{u}m)" stroke="{INK}" stroke-width="{4 / wings:.2f}" stroke-linejoin="round" {"opacity=.92" if ghost else ""}/>'
             f'<path d="{WING_LINES}" stroke="{INK}" stroke-width="{2.4 / wings:.2f}" fill="none" stroke-linecap="round" opacity=".45"/></g>')
        if ghost:
            outer = (f'<g transform="translate(58 96) scale(1.0 1.12) rotate(-14 58 96) translate(-58 -96)">'
                     f'<path d="{WING}" fill="{glow}" opacity=".45" filter="url(#{u}glow)"/>'
                     f'<path d="{WING}" fill="#FFFFFF" fill-opacity=".35" stroke="{glow}" stroke-width="3" stroke-linejoin="round"/></g>')
            back.append(_mirror(outer))
        back.append(_mirror(w))
    if crown:
        back.append(f"""<path d="M68 52 L60 16 L82 32 L100 4 L118 32 L140 16 L132 52 Z" fill="url(#{u}gold)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>
<circle cx="100" cy="24" r="5.5" fill="{glow}" stroke="{INK}" stroke-width="2.5"/>
<circle cx="78" cy="38" r="3.5" fill="{glow}" stroke="{INK}" stroke-width="2"/><circle cx="122" cy="38" r="3.5" fill="{glow}" stroke="{INK}" stroke-width="2"/>""")
    if spikes:
        spike = f'<path d="M54 64 L30 54 L52 88 Z" fill="url(#{u}m)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
        back.append(_mirror(spike))

    # ---------------------------------------------------------------- body
    body_svg = f"""<path d="{body}" fill="{INK}" transform="translate(0 6)" opacity=".55"/>
<path d="{body}" fill="url(#{u}m)" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>
<g clip-path="url(#{u}c)"><ellipse cx="78" cy="46" rx="70" ry="30" fill="#FFFFFF" opacity=".22"/></g>
<path d="{body}" fill="url(#{u}p)" stroke="{hi}" stroke-opacity=".7" stroke-width="2.5" transform="translate(100 104) scale(.78) translate(-100 -104)"/>"""

    eyes = EYES.format(u=u, c=glow) if glow else ""
    skull = SKULL.format(u=u, ink=INK, eyes=eyes)
    skull_svg = f'<g transform="translate(19 23.05) scale(1.35)">{skull}</g>'

    # ---------------------------------------------------------------- apex gem
    if ghost:
        front.append(f'<path d="M100 150 L114 164 L100 182 L86 164 Z" fill="{glow}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>'
                     f'<path d="M100 155 L108 164 L100 158 Z" fill="#FFFFFF" opacity=".9"/>')

    return f"""<svg xmlns="http://www.w3.org/2000/svg" class="emblem emblem-{key}" viewBox="-14 -8 228 222" width="{size}" height="{size}" role="img" aria-label="{tier['label']}">
{defs}{''.join(back)}{body_svg}{skull_svg}{''.join(front)}</svg>"""
