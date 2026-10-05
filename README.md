# tarot.trackr.live

Tarot readings where the cards are drawn by code, the question is read by
[Jev](https://typesafe.ai) (TypeSafe's judgement model), and every word of
the reading comes from text written in advance. No text is generated on the
fly.

```
question ──► Jev: domain · register · facet per card · anchor pair
                                   │
seed ──► ChaCha20 stream ──► shuffle, reversals ──► assemble ◄── content/*.json
                                   │
                         reading text + share link
```

- **Draws** come from a fresh 128-bit seed, expanded into a ChaCha20 keystream:
  unpredictable when drawn, exactly reproducible from the seed.
- **Jev** answers one request of independent Choice questions per reading. The
  question travels only as state, never as instructions. Domain and register
  fall back below calibrated confidence thresholds (`src/lib/server/jev.ts`).
  With no key, or on any Jev error, the reading still works on the fallback.
- **Spend ceiling**: every Jev call reserves its worst-case cost first and is
  refused past $10/month or $1/day (`src/lib/server/budget.ts`); over budget,
  readings fall back instead of failing.
- **Text** is assembled from `content/`: 78 cards × 2 orientations × 6 domains
  × 6 registers × 3 variants, plus openings, position lead-ins, and closings.
  `content/STYLE.md` is the authoring guide; `npm run lint:content` enforces it.
- **Share links** carry the seed and Jev's classification, so opening one
  rebuilds the reading exactly without asking Jev again. The question is left
  out unless the reader opts in.
- **Art** is Pamela Colman Smith's original 1909 illustrations, public domain,
  from Wikimedia Commons (`src/lib/assets/cards/SOURCES.json`).

## Develop

```bash
cp .env.example .env          # add TYPESAFE_API_KEY
npm install
npm run dev
npm test                      # unit tests, content lint, 100k-shuffle chi-squared
npm run lint:content          # just the content rules
JEV_LIVE=1 npx vitest run src/lib/server/jev.live.spec.ts   # recalibrate thresholds
```

Requires Node 22+. If `npm install` fails with `reading 'edgesOut'`, the npm
is too old for Node 22: use `npx npm@11 install`.

## Deploy

See [DEPLOY.md](DEPLOY.md).
