import { CARDS_BY_ID } from '#lib/deck.js';
import {
	DOMAINS,
	EMPHASES,
	ORIENTATIONS,
	REGISTERS,
	SLOTS,
	type CardContent,
	type Closings,
	type Connectors,
	type Openings,
	type SingleClosings
} from './content.js';

/**
 * Content rules. Assembly never errors on missing content (it falls back),
 * so these checks are what keeps the fallbacks rare.
 */

export const MIN_VARIANTS = 3;
const MIN_FACETS = 3;
const MAX_FACETS = 5;
const MIN_CHARS = 30;
const MAX_CHARS = 420;

/**
 * Health readings are reflective only. Anything that reads as diagnosis,
 * prognosis or treatment advice is a lint error, not a judgement call.
 */
const MEDICAL =
	/\b(diagnos\w*|prognos\w*|cure[sd]?|treatment\w*|medicat\w*|prescri\w*|dosage|symptom\w*|disease\w*|cancer|tumou?r\w*|surger\w*|remission|terminal|illness(es)?|recover(y|ies) from)\b/i;

const SLOT = /\{([a-z_]+)\}/g;

type Kind = keyof typeof SLOTS;

function checkText(text: unknown, kind: Kind, where: string, problems: string[]) {
	if (typeof text !== 'string') {
		problems.push(`${where}: not a string`);
		return;
	}
	const allowed: readonly string[] = SLOTS[kind];
	for (const [, name] of text.matchAll(SLOT)) {
		if (!allowed.includes(name)) problems.push(`${where}: unknown slot {${name}}`);
	}
	// Slots carry their own article: "The Tower", "the Three of Cups", "a truth".
	const article = text.match(/\b(a|an|the)\s+(?:[a-z]+\s+)?\{(card|keyword)\}/i);
	if (article) problems.push(`${where}: article before {${article[2]}} ("${article[0]}")`);
	const stray = text.replace(SLOT, '');
	if (/[{}]/.test(stray)) problems.push(`${where}: unbalanced brace`);
	if (text !== text.trim() || /\s{2,}/.test(text)) problems.push(`${where}: stray whitespace`);
	if (!/[.!?…"”’)]$/.test(text)) problems.push(`${where}: does not end a sentence`);
	if (kind === 'fragment' || kind === 'closing' || kind === 'single_closing') {
		if (text.length < MIN_CHARS) problems.push(`${where}: under ${MIN_CHARS} chars`);
		if (text.length > MAX_CHARS) problems.push(`${where}: over ${MAX_CHARS} chars`);
	}
}

function checkVariants(
	variants: unknown,
	kind: Kind,
	where: string,
	problems: string[],
	opts: { medical?: boolean; mustUse?: string } = {}
) {
	if (!Array.isArray(variants)) {
		problems.push(`${where}: missing`);
		return;
	}
	if (variants.length < MIN_VARIANTS) {
		problems.push(`${where}: ${variants.length} variants, need ${MIN_VARIANTS}`);
	}
	if (new Set(variants).size !== variants.length) problems.push(`${where}: duplicate variants`);
	variants.forEach((text, i) => {
		checkText(text, kind, `${where}[${i}]`, problems);
		if (typeof text !== 'string') return;
		if (opts.medical && MEDICAL.test(text)) {
			problems.push(`${where}[${i}]: medical language "${text.match(MEDICAL)![0]}"`);
		}
		if (opts.mustUse) {
			const uses = text.split(`{${opts.mustUse}}`).length - 1;
			if (uses !== 1) problems.push(`${where}[${i}]: uses {${opts.mustUse}} ${uses} times, need 1`);
		}
	});
}

export function lintCard(card: CardContent): string[] {
	const problems: string[] = [];
	const where = card.id ?? '<no id>';
	const deckCard = CARDS_BY_ID.get(card.id);
	if (!deckCard) return [`${where}: not a card in the deck`];
	if (card.name !== deckCard.name)
		problems.push(`${where}: name "${card.name}" ≠ "${deckCard.name}"`);

	const facets = Array.isArray(card.facets) ? card.facets : [];
	if (facets.length < MIN_FACETS || facets.length > MAX_FACETS) {
		problems.push(`${where}: ${facets.length} facets, need ${MIN_FACETS}–${MAX_FACETS}`);
	}
	const facetIds = facets.map((f) => f.id);
	if (new Set(facetIds).size !== facetIds.length) problems.push(`${where}: duplicate facet ids`);
	for (const facet of facets) {
		if (!/^[a-z][a-z_]*$/.test(facet.id ?? ''))
			problems.push(`${where}: bad facet id "${facet.id}"`);
		if (!Array.isArray(facet.keywords) || facet.keywords.length < 2) {
			problems.push(`${where}/${facet.id}: needs at least 2 keywords`);
			continue;
		}
		for (const keyword of facet.keywords) {
			if (typeof keyword !== 'string' || !/^[a-z][a-z' -]*[a-z]$/.test(keyword)) {
				problems.push(`${where}/${facet.id}: keyword "${keyword}" must be a lowercase phrase`);
			}
		}
	}

	for (const orientation of ORIENTATIONS) {
		for (const domain of DOMAINS) {
			for (const register of REGISTERS) {
				checkVariants(
					card.fragments?.[orientation]?.[domain]?.[register],
					'fragment',
					`${where}.${orientation}.${domain}.${register}`,
					problems,
					{ medical: domain === 'health', mustUse: 'keyword' }
				);
			}
		}
	}
	return problems;
}

export function lintOpenings(openings: Openings): string[] {
	const problems: string[] = [];
	for (const register of REGISTERS) {
		checkVariants(openings[register], 'opening', `openings.${register}`, problems);
	}
	return problems;
}

export function lintConnectors(connectors: Connectors): string[] {
	const problems: string[] = [];
	for (const emphasis of EMPHASES) {
		checkVariants(connectors[emphasis], 'connector', `connectors.${emphasis}`, problems, {
			mustUse: 'card'
		});
	}
	return problems;
}

export function lintClosings(closings: Closings, singles: SingleClosings): string[] {
	const problems: string[] = [];
	for (const domain of DOMAINS) {
		for (const register of REGISTERS) {
			const at = `${domain}.${register}`;
			checkVariants(closings[domain]?.[register], 'closing', `closings.${at}`, problems, {
				medical: domain === 'health'
			});
			for (const [i, text] of (closings[domain]?.[register] ?? []).entries()) {
				if (!text.includes('{anchor_a}') || !text.includes('{anchor_b}')) {
					problems.push(`closings.${at}[${i}]: must use both {anchor_a} and {anchor_b}`);
				}
			}
			checkVariants(
				singles[domain]?.[register],
				'single_closing',
				`single_closings.${at}`,
				problems,
				{ medical: domain === 'health', mustUse: 'card' }
			);
		}
	}
	return problems;
}
