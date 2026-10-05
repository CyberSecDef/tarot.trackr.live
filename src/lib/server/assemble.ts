import type { Classification } from './classify.js';
import { CONTENT, type ContentBundle, type Domain, type Register } from './content.js';
import type { DrawnCard } from './draw.js';
import { Stream } from './rng.js';

export interface ReadingSection {
	position: string;
	label: string;
	cardId: string;
	cardName: string;
	reversed: boolean;
	/** The facet keyword that was used, for highlighting in the UI. */
	keyword: string;
	text: string;
}

export interface AssembledReading {
	opening: string;
	sections: ReadingSection[];
	closing: string;
	/** The whole reading as plain text with paragraph breaks. */
	text: string;
	/** Content lookups that had to fall back, for logging. */
	fallbacks: string[];
}

type Nested = Partial<Record<Domain, Partial<Record<Register, string[]>>>>;

/**
 * Find variants for (domain, register), falling back to the neutral register,
 * then the general domain. Never throws: an empty result means "use the
 * built-in last resort".
 */
function lookup(
	tree: Nested | undefined,
	domain: Domain,
	register: Register,
	where: string,
	fallbacks: string[]
): string[] {
	const chain: [Domain, Register][] = [
		[domain, register],
		[domain, 'neutral'],
		['general', register],
		['general', 'neutral']
	];
	for (const [i, [d, r]] of chain.entries()) {
		const found = tree?.[d]?.[r];
		if (found?.length) {
			if (i > 0) fallbacks.push(`${where}: ${domain}.${register} → ${d}.${r}`);
			return found;
		}
	}
	fallbacks.push(`${where}: no content`);
	return [];
}

/** Four-word phrases in a template, slots included ("{keyword} may be paused"). */
function phrases(text: string): string[] {
	const words = text.toLowerCase().match(/\{[a-z_]+\}|[a-z']+/g) ?? [];
	const out: string[] = [];
	for (let i = 0; i + 4 <= words.length; i++) out.push(words.slice(i, i + 4).join(' '));
	return out;
}

/** What one reading has said so far, so later choices can avoid echoing it. */
interface Said {
	variants: Set<string>;
	phrases: Set<string>;
}

/**
 * Choose a variant this reading hasn't used, preferring the ones that share
 * the fewest four-word phrases with what it has already said. Different
 * cards' authors drifted toward the same stock frames ("if you are hoping
 * for..."); this keeps those from stacking up inside a single reading. The
 * pick among the least-repetitive candidates is still seeded, so the result
 * stays deterministic.
 */
function fresh(stream: Stream, variants: string[], said: Said): string {
	const unused = variants.filter((v) => !said.variants.has(v));
	const pool = unused.length ? unused : variants;
	const overlap = pool.map((v) => phrases(v).filter((p) => said.phrases.has(p)).length);
	const least = Math.min(...overlap);
	const choice = stream.pick(pool.filter((_, i) => overlap[i] === least));
	said.variants.add(choice);
	for (const p of phrases(choice)) said.phrases.add(p);
	return choice;
}

function fill(template: string, slots: Record<string, string>): string {
	const filled = template.replace(/\{([a-z_]+)\}/g, (match, name) => slots[name] ?? match);
	// A slot can open a sentence ("{keyword} may ..."), so capitalise sentence starts.
	return filled.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
}

/**
 * A card's name as it reads mid-sentence. Major Arcana names carry their own
 * article ("The Tower", "Strength"); Minor Arcana need one ("the Three of
 * Wands"). Sentence-start capitalisation in fill() handles the rest.
 */
function proseName(card: DrawnCard): string {
	return card.card.arcana === 'minor' ? `the ${card.card.name}` : card.card.name;
}

function displayName(card: DrawnCard): string {
	return card.reversed ? `${proseName(card)} (reversed)` : proseName(card);
}

/**
 * Build the reading text. Pure: the same draw, classification and seed always
 * give the same text, which is what lets a share link rebuild a reading
 * without asking Jev again.
 */
export function assemble(
	cards: DrawnCard[],
	cls: Classification,
	seed: string,
	content: ContentBundle = CONTENT
): AssembledReading {
	const { openings, connectors, closings, singleClosings } = content;
	const stream = new Stream(seed, 'assembly');
	const said: Said = { variants: new Set(), phrases: new Set() };
	const fallbacks: string[] = [];
	const { domain, register } = cls;

	const openingVariants = openings[register]?.length ? openings[register] : openings.neutral;
	const opening = openingVariants?.length ? fresh(stream, openingVariants, said) : '';

	const sections = cards.map((drawn, i): ReadingSection => {
		const card = content.cards.get(drawn.card.id);
		const orientation = drawn.reversed ? 'reversed' : 'upright';
		const facet =
			card?.facets.find((f) => f.id === cls.facets[i]) ??
			(card?.facets[0] && (fallbacks.push(`${drawn.card.id}: facet → first`), card.facets[0]));
		const keyword = facet ? stream.pick(facet.keywords) : '';

		const leadIns = connectors[drawn.position.emphasis] ?? [];
		const connector = leadIns.length
			? fill(fresh(stream, leadIns, said), {
					card: proseName(drawn),
					position: drawn.position.label
				})
			: '';

		const variants = lookup(
			card?.fragments[orientation],
			domain,
			register,
			`${drawn.card.id}.${orientation}`,
			fallbacks
		);
		const fragment = variants.length
			? fill(fresh(stream, variants, said), { card: proseName(drawn), keyword })
			: `${fill(proseName(drawn), {})} appears${drawn.reversed ? ', reversed,' : ''} in this place. Sit with what it stirs in you before reading further.`;

		return {
			position: drawn.position.id,
			label: drawn.position.label,
			cardId: drawn.card.id,
			cardName: drawn.card.name,
			reversed: drawn.reversed,
			keyword,
			text: [connector, fragment].filter(Boolean).join(' ')
		};
	});

	let closing = '';
	if (cards.length === 1) {
		const variants = lookup(singleClosings, domain, register, 'single_closing', fallbacks);
		if (variants.length)
			closing = fill(fresh(stream, variants, said), { card: displayName(cards[0]) });
	} else if (cls.anchor) {
		const [a, b] = cls.anchor;
		const variants = lookup(closings, domain, register, 'closing', fallbacks);
		if (variants.length) {
			closing = fill(fresh(stream, variants, said), {
				anchor_a: displayName(cards[a]),
				anchor_b: displayName(cards[b])
			});
		}
	}

	const text = [
		opening,
		...sections.map(
			(s) => `${s.label} · ${s.cardName}${s.reversed ? ' (reversed)' : ''}\n${s.text}`
		),
		closing
	]
		.filter(Boolean)
		.join('\n\n');

	return { opening, sections, closing, text, fallbacks };
}
