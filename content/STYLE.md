# Writing reading content

Every word a reading shows comes from the files in this folder. Code picks and
joins them; nothing rewrites them afterwards. A fragment has to read well on
its own, next to any other card's fragment, for any question in its domain.

`npm run lint:content` enforces the mechanical rules below. The voice rules
are on you.

## How a reading is put together

```
{opening}                                   ← openings.json, by register

{position label} · {card name}
{connector}  {fragment}                     ← connectors.json by emphasis; card fragment
... one block per card ...

{closing}                                   ← closings.json by domain + register
```

Jev reads the question and chooses: a **domain** (love, career, money, health,
spiritual, general), a **register** (how the person seems to feel: anxious,
curious, grieving, skeptical, hopeful), a **facet** for each card, and an
**anchor pair** of cards that the closing ties together. `neutral` is the
register used when Jev is unsure or there is no question. Jev never picks it,
but every leaf still needs it.

## Card files: `cards/<card_id>.json`

```json
{
	"id": "major_16_tower",
	"name": "The Tower",
	"facets": [{ "id": "upheaval", "keywords": ["sudden change", "a structure collapsing"] }],
	"fragments": {
		"upright": { "<domain>": { "<register>": ["...", "...", "..."] } },
		"reversed": { "<domain>": { "<register>": ["...", "...", "..."] } }
	}
}
```

- **3–5 facets**, each a distinct reading of the card (The Tower: upheaval,
  revelation, liberation). Facet ids are lowercase snake_case.
- **Keywords are lowercase noun phrases**, 2–4 per facet. Each must slot into
  any fragment as a noun phrase: "sudden change", "a truth coming to light".
  No verbs on their own, no adjectives on their own, no capitals, no
  punctuation.
- **Keywords are singular** so a verb after `{keyword}` ("is", "may feel")
  agrees whichever keyword is chosen. Avoid plurals like "fresh eyes".
- **Keywords work in both orientations.** Don't make one keyword read as the
  reversed meaning; the reversed fragments carry the reversal ("{keyword} may
  be on hold", "feeling left out of {keyword}").
- **Never put an article before `{card}` either.** It already carries one:
  Major Arcana arrive as "The Tower" or "Strength", Minor Arcana as "the
  Three of Cups". Sentence starts are capitalised automatically.
- **Never put an article before `{keyword}`.** Some keywords start with "a",
  some don't; "the {keyword}" breaks on "the a truth coming to light".
- **Every leaf exists**: 2 orientations × 6 domains × 6 registers = 72 leaves,
  each with **at least 3 variants**.
- **Every fragment uses `{keyword}` exactly once**, as a noun phrase. That slot
  is how Jev's facet choice reaches the text. `{card}` (the card's name) is
  optional. No other slots.
- Fragments are **1–3 sentences, 30–420 characters**, and end with sentence
  punctuation.

## Voice

**Second person, present tense, plain words.** Warm, not syrupy. Speak to the
person, not about the card's history.

**Suggest, never predict.** Tarot here is a mirror for reflection, not
fortune-telling. Use "may", "could", "invites", "asks". Never say "you will",
"this guarantees", or anything that sounds like a promise or a doom.

**Each variant must say something different.** Three rewordings of one idea
fail the reader, who may draw the same card twice. Vary the angle: a feeling,
an action, a question to sit with.

**The fragment has to fit any position.** A connector before it already says
where the card sits ("In the place of the past, ..."), so don't write
"this card in the past shows". Don't refer to other cards.

**Domains change what the fragment is about:**

| Domain    | Write about                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| love      | partners, attraction, family, friendship, how people treat each other                                                                                                                                  |
| career    | work, vocation, colleagues, ambition, craft                                                                                                                                                            |
| money     | resources, security, spending and saving, value, exchange                                                                                                                                              |
| health    | energy, rest, stress, the body as felt experience, care and habits. **Reflective only**: never name a condition, diagnosis, treatment, medication, symptom or recovery. The linter blocks these words. |
| spiritual | meaning, intuition, belief, inner growth, practice                                                                                                                                                     |
| general   | life as a whole when no domain is clear                                                                                                                                                                |

**Registers change how it is said:**

| Register  | The person seems                 | Write                                                                                                 |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| anxious   | worried, braced for bad news     | grounding and steady. Name one small thing in their control. Never amplify fear, even for hard cards. |
| curious   | open, exploring                  | inviting, a little playful, opens questions                                                           |
| grieving  | carrying a loss                  | gentle and unhurried. No silver linings, no "everything happens for a reason".                        |
| skeptical | doubtful the cards mean anything | plain and practical. Frame the card as a prompt for thinking, not a force. No mystical claims.        |
| hopeful   | wanting a good outcome           | encouraging but honest. Don't promise the outcome.                                                    |
| neutral   | unknown                          | balanced, clear, neither soothing nor bracing                                                         |

**Reversed is not "bad".** A reversal reads as the card's energy blocked,
inward, delayed, overdone, or in early stages. Hard cards reversed often ease
(The Tower reversed: resisting a change that is already coming, or one that
arrives more gently).

**Hard cards stay humane.** Death is transformation, not death. The Tower is
change, not catastrophe. Ten of Swords is an ending, not violence. For
`anxious` and `grieving`, the hardest cards especially must not frighten.

**Never:** medical, legal or financial instructions; predictions about a third
party's private choices ("he will come back"); self-harm, violence or curse
language; gendered assumptions about the person or their partner; the word
"destiny".

## Example: The Tower, upright, career

```json
"anxious": [
  "At work, {keyword} can feel like the ground shifting. You don't have to steady everything at once; choose the one task that is still solid and start there.",
  "{keyword} in your working life may be unsettling, yet it often clears space that was already too cramped to grow in. Breathe, then look at what is still standing.",
  "If {keyword} is shaking your job, you are allowed to take it one day at a time. Ask yourself which part of this change you can actually influence this week."
],
"skeptical": [
  "Treat {keyword} as a prompt: is there a structure at work you keep propping up that isn't really holding? Naming it is cheaper than waiting for it to fail.",
  "Read practically, {keyword} points to a plan or role that may need rebuilding rather than patching. Which assumption at work have you stopped checking?",
  "There is nothing mystical required here: {keyword} is a familiar pattern at work. When something is about to give, the useful move is to decide what you would rebuild first."
]
```

Note that `{keyword}` can begin a sentence. Assembly capitalises the first
letter of every sentence, so write it lowercase-safe either way.

## Shared files

- **`openings.json`**: register → 3+ one-sentence openings. No slots. An
  opening must work for a 1-, 3- or 10-card reading: no "these cards", "each
  card", or "this spread".
- **`connectors.json`**: emphasis (past, present, future, self, obstacle,
  outcome, advice) → 3+ short lead-ins. Must use `{card}`; may use
  `{position}`, though the heading already names the position, so it rarely
  reads well. Example: "Where things began, {card} appears."
- **`closings.json`**: domain → register → 3+ closing paragraphs that use both
  `{anchor_a}` and `{anchor_b}` (the two cards Jev judged most connected), and
  say how they speak to each other.
- **`single_closings.json`**: the same shape, for one-card readings. Uses
  `{card}` instead of the pair.
