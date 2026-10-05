#!/usr/bin/env python3
"""Find stock phrasing shared across many cards.

A reader who draws ten cards sees ten fragments side by side. A five-word
phrase that recurs across many different cards reads as a template, even
though every fragment passes the linter. This lists the worst offenders and
which cards and leaves carry them, so they can be rewritten.

    python3 scripts/audit-repetition.py [--min-cards 8] [--json out.json]
"""

import argparse
import glob
import json
import re
from collections import defaultdict

ap = argparse.ArgumentParser()
ap.add_argument("--min-cards", type=int, default=8)
ap.add_argument("--n", type=int, default=5)
ap.add_argument("--json")
args = ap.parse_args()

phrase_cards = defaultdict(set)
phrase_where = defaultdict(list)
total = 0

for path in sorted(glob.glob("content/cards/*.json")):
    card = json.load(open(path))
    for orient, domains in card["fragments"].items():
        for domain, registers in domains.items():
            for register, variants in registers.items():
                for i, text in enumerate(variants):
                    total += 1
                    words = re.findall(r"[a-z']+|\{[a-z_]+\}", text.lower())
                    seen = set()
                    for k in range(len(words) - args.n + 1):
                        gram = " ".join(words[k : k + args.n])
                        if gram in seen:
                            continue
                        seen.add(gram)
                        phrase_cards[gram].add(card["id"])
                        phrase_where[gram].append(f"{card['id']}.{orient}.{domain}.{register}[{i}]")

flagged = sorted(
    ((g, c) for g, c in phrase_cards.items() if len(c) >= args.min_cards),
    key=lambda gc: -len(gc[1]),
)
print(f"{total} fragments across {len(glob.glob('content/cards/*.json'))} cards")
print(f"{len(flagged)} phrases of {args.n} words appear in >= {args.min_cards} different cards\n")
for gram, cards in flagged[:40]:
    print(f"{len(cards):3d} cards  {len(phrase_where[gram]):4d} uses  \"{gram}\"")

if args.json:
    json.dump(
        {g: sorted(phrase_where[g]) for g, _ in flagged},
        open(args.json, "w"),
        indent=1,
    )
