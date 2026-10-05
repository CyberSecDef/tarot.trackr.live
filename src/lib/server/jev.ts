import type { Classification, Classifier, ClassifyInput } from './classify.js';
import { defaultAnchor, firstFacet } from './classify.js';
import {
	CARD_CONTENT,
	DOMAINS,
	JEV_REGISTERS,
	TIME_FOCI,
	type Domain,
	type JevRegister,
	type TimeFocus
} from './content.js';

/**
 * Jev (TypeSafe System One) as the reading classifier.
 *
 * One request per reading: every judgement is an independent Choice question
 * over the same state, so they run in parallel and none sees another's answer.
 * The user's question travels only as state, never inside instructions, so
 * text like "ignore the above" is just more of the question to classify.
 */

export interface Thresholds {
	domain: number;
	register: number;
	timeFocus: number;
	/** Every facet is a valid reading of the card, so low confidence is harmless. */
	facet: number;
	/** 45-way for the Celtic Cross: spread-out probability is expected, not a failure. */
	anchor: number;
}

/**
 * Set from a live run of 36 labelled questions (jev.live.spec.ts, 2026-10-04,
 * jev-1.13.0). Domain was 36/36 correct, never below 0.60. Register was 28/36:
 * wrong answers sat at 0.40–0.77, right ones mostly ≥0.67, so 0.62 turns 5 of
 * the 8 misses into the safe neutral tone while losing 1 of 28 right answers.
 * Rerun the calibration after changing criteria wording or the model.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
	domain: 0.5,
	register: 0.62,
	timeFocus: 0.4,
	facet: 0,
	anchor: 0
};

const DOMAIN_CRITERIA: Record<Domain, string> = {
	love: 'Romance, partners, attraction, family, friendship, or how people treat each other.',
	career: 'Work, jobs, vocation, colleagues, ambition, study, or craft.',
	money: 'Finances, resources, security, spending, saving, debt, or material value.',
	health:
		'Energy, rest, stress, wellbeing, the body, or care habits. Includes worries about physical or mental health.',
	spiritual: 'Meaning, purpose, intuition, faith, belief, inner growth, or spiritual practice.',
	general:
		'No single area above fits: a broad life question, several areas at once, or no clear topic.'
};

const REGISTER_CRITERIA: Record<JevRegister, string> = {
	anxious: 'Worried, afraid, or bracing for bad news; wants reassurance or a sense of control.',
	curious: 'Open and exploratory; interested in what the cards might show, without urgency.',
	grieving: 'Carrying a loss: a death, a breakup, an ending, or something they cannot get back.',
	skeptical: 'Doubtful the cards mean anything; testing, joking, or asking for practical sense.',
	hopeful: 'Wanting or expecting a good outcome; asking about a wish, a chance, or a new start.'
};

const TIME_CRITERIA: Record<TimeFocus, string> = {
	past: 'Mainly about understanding something that already happened.',
	present: 'Mainly about the current situation or a decision right now.',
	future: 'Mainly about what may come next or how something will turn out.'
};

interface ChoiceAnswer {
	type: 'choice';
	choice: string;
	probabilities?: Record<string, number>;
	confidence?: number;
}

export interface JevOptions {
	apiKey: string;
	baseUrl: string;
	model: string;
	thresholds?: Partial<Thresholds>;
	timeoutMs?: number;
	fetch?: typeof fetch;
}

export class JevError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
	}
}

function pairKey(a: number, b: number): string {
	return `${a}-${b}`;
}

/** Build the request body. Exported so tests can check its shape. */
export function buildRequest(input: ClassifyInput, model: string) {
	const cards = input.cards.map((c, i) => ({
		index: i,
		position: c.position.label,
		position_meaning: c.position.emphasis,
		card: c.card.name,
		orientation: c.reversed ? 'reversed' : 'upright'
	}));

	const questions: Record<string, unknown> = {
		domain: {
			type: 'choice',
			instructions: 'Which area of life is the person asking about in `question`?',
			criteria: DOMAIN_CRITERIA
		},
		register: {
			type: 'choice',
			instructions:
				'How does the person who wrote `question` seem to feel about it? Judge their emotional stance, not the topic.',
			criteria: REGISTER_CRITERIA
		},
		time_focus: {
			type: 'choice',
			instructions: 'Which period of time is `question` mainly concerned with?',
			criteria: TIME_CRITERIA
		}
	};

	input.cards.forEach((c, i) => {
		const facets = CARD_CONTENT.get(c.card.id)?.facets ?? [];
		if (facets.length < 2) return; // nothing to choose
		questions[`facet_${i}`] = {
			type: 'choice',
			instructions: `In a tarot reading about \`question\`, the card at \`cards[${i}]\` has several traditional meanings. Which meaning speaks most directly to the person's question?`,
			criteria: Object.fromEntries(facets.map((f) => [f.id, f.keywords.join('; ')]))
		};
	});

	if (input.cards.length >= 2) {
		const pairs: Record<string, string> = {};
		for (let a = 0; a < input.cards.length; a++) {
			for (let b = a + 1; b < input.cards.length; b++) {
				pairs[pairKey(a, b)] =
					`${cards[a].card} (${cards[a].position}) with ${cards[b].card} (${cards[b].position})`;
			}
		}
		questions.anchor_pair = {
			type: 'choice',
			instructions:
				'Which two cards in `cards`, read together, say the most about `question`? Consider their positions and traditional meanings.',
			criteria: pairs
		};
	}

	return { model, state: { question: input.question, cards }, questions };
}

export class JevClassifier implements Classifier {
	private thresholds: Thresholds;
	private fetch: typeof fetch;

	constructor(private opts: JevOptions) {
		this.thresholds = { ...DEFAULT_THRESHOLDS, ...opts.thresholds };
		this.fetch = opts.fetch ?? globalThis.fetch;
	}

	private async post(body: unknown): Promise<Record<string, ChoiceAnswer>> {
		for (let attempt = 0; ; attempt++) {
			const response = await this.fetch(`${this.opts.baseUrl.replace(/\/$/, '')}/systemone`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${this.opts.apiKey}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(this.opts.timeoutMs ?? 8000)
			});
			if (response.ok) {
				const data = (await response.json()) as { answers?: Record<string, ChoiceAnswer> };
				if (!data.answers) throw new JevError('response had no answers');
				return data.answers;
			}
			// One quick retry on rate limiting or overload; the reading can't wait long.
			const retryable = response.status === 429 || response.status >= 500;
			if (!retryable || attempt >= 1) {
				throw new JevError(`HTTP ${response.status}`, response.status);
			}
			await new Promise((r) => setTimeout(r, 400));
		}
	}

	async classify(input: ClassifyInput): Promise<Classification> {
		const answers = await this.post(buildRequest(input, this.opts.model));
		const fellBack: string[] = [];
		const t = this.thresholds;

		const accept = <T extends string>(
			key: string,
			allowed: readonly T[],
			threshold: number,
			fallback: T
		): T => {
			const answer = answers[key];
			if (!answer || !allowed.includes(answer.choice as T)) {
				fellBack.push(`${key}: missing`);
				return fallback;
			}
			const confidence = answer.confidence ?? 0;
			if (confidence < threshold) {
				fellBack.push(`${key}: ${answer.choice} at ${confidence.toFixed(2)} < ${threshold}`);
				return fallback;
			}
			return answer.choice as T;
		};

		const domain = accept('domain', DOMAINS, t.domain, 'general');
		const register = accept<JevRegister | 'neutral'>(
			'register',
			[...JEV_REGISTERS],
			t.register,
			'neutral'
		);
		const timeFocus = accept('time_focus', TIME_FOCI, t.timeFocus, 'present');

		const facets = input.cards.map((c, i) => {
			const ids = CARD_CONTENT.get(c.card.id)?.facets.map((f) => f.id) ?? [];
			if (ids.length < 2) return firstFacet(c.card.id);
			return accept(`facet_${i}`, ids, t.facet, ids[0]);
		});

		let anchor = defaultAnchor(input.cards.length);
		if (anchor) {
			const pairs: string[] = [];
			for (let a = 0; a < input.cards.length; a++) {
				for (let b = a + 1; b < input.cards.length; b++) pairs.push(pairKey(a, b));
			}
			const chosen = accept('anchor_pair', pairs, t.anchor, pairKey(...anchor));
			const [a, b] = chosen.split('-').map(Number);
			anchor = [a, b];
		}

		return { domain, register, timeFocus, facets, anchor, source: 'jev', fellBack };
	}
}
