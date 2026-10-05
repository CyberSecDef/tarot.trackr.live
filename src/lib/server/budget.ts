import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * A hard ceiling on what this service can spend on Jev.
 *
 * Every call reserves its worst-case cost before it is sent and is refused if
 * that could cross the monthly or daily cap. After the call the reservation
 * is replaced by the real cost from the response's `usage`. A failed call
 * keeps its reservation: it may have been billed, and over-counting is the
 * safe direction. A refused call never reaches Jev, so the cap holds even
 * when the estimate is wrong, as long as the estimate errs high.
 *
 * Spend is kept in a small JSON ledger keyed by UTC month, so restarts and
 * deploys do not reset it. One Node process owns the file; that is the only
 * deployment shape this app has.
 */

export interface BudgetOptions {
	/** USD per calendar month (UTC). */
	monthlyUsd: number;
	/** USD per UTC day, so one bad day cannot spend the month. */
	dailyUsd: number;
	/** USD per million input tokens. */
	inputPerMTok: number;
	/** USD per million output tokens. */
	outputPerMTok: number;
	/** Where the ledger lives. */
	path: string;
	now?: () => Date;
}

interface Ledger {
	month: string;
	spentUsd: number;
	calls: number;
	refused: number;
	days: Record<string, number>;
}

export class BudgetExceededError extends Error {
	constructor(readonly scope: 'monthly' | 'daily') {
		super(`Jev ${scope} budget reached`);
	}
}

/** Request JSON runs ~2.7 characters per token; 2 makes the estimate run high. */
const CHARS_PER_TOKEN_ESTIMATE = 2;
/** Output is a few hundred tokens per reading; budget it generously. */
const OUTPUT_TOKENS_ESTIMATE = 2000;

export class JevBudget {
	private ledger: Ledger;
	private reserved = 0;
	private now: () => Date;
	private warned = new Set<number>();

	constructor(private opts: BudgetOptions) {
		this.now = opts.now ?? (() => new Date());
		this.ledger = this.load();
	}

	private month(): string {
		return this.now().toISOString().slice(0, 7);
	}

	private day(): string {
		return this.now().toISOString().slice(0, 10);
	}

	private load(): Ledger {
		try {
			const parsed = JSON.parse(readFileSync(this.opts.path, 'utf8')) as Ledger;
			if (parsed.month === this.month() && typeof parsed.spentUsd === 'number') return parsed;
		} catch {
			/* no ledger yet, or unreadable: start the month fresh */
		}
		return { month: this.month(), spentUsd: 0, calls: 0, refused: 0, days: {} };
	}

	private rollover() {
		if (this.ledger.month !== this.month()) {
			this.ledger = { month: this.month(), spentUsd: 0, calls: 0, refused: 0, days: {} };
			this.warned.clear();
		}
	}

	private save() {
		try {
			mkdirSync(dirname(this.opts.path), { recursive: true });
			const tmp = `${this.opts.path}.tmp`;
			writeFileSync(tmp, JSON.stringify(this.ledger, null, 1));
			renameSync(tmp, this.opts.path);
		} catch (err) {
			console.error('[budget] could not save ledger:', (err as Error).message);
		}
	}

	/** Upper-bound cost of sending this request body. */
	estimate(body: unknown): number {
		const inputTokens = Math.ceil(JSON.stringify(body).length / CHARS_PER_TOKEN_ESTIMATE);
		return this.cost(inputTokens, OUTPUT_TOKENS_ESTIMATE);
	}

	cost(inputTokens: number, outputTokens: number): number {
		return (
			(inputTokens * this.opts.inputPerMTok + outputTokens * this.opts.outputPerMTok) / 1_000_000
		);
	}

	/**
	 * Reserve worst-case spend for one call, or throw if it could cross a cap.
	 * Returns a settle function to call exactly once with the real usage (or
	 * with nothing, if the call failed).
	 */
	reserve(
		estimateUsd: number
	): (usage?: { input_tokens?: number; output_tokens?: number }) => void {
		this.rollover();
		const today = this.ledger.days[this.day()] ?? 0;
		const scope =
			this.ledger.spentUsd + this.reserved + estimateUsd > this.opts.monthlyUsd
				? 'monthly'
				: today + this.reserved + estimateUsd > this.opts.dailyUsd
					? 'daily'
					: null;
		if (scope) {
			this.ledger.refused++;
			this.save();
			throw new BudgetExceededError(scope);
		}

		this.reserved += estimateUsd;
		let settled = false;
		return (usage) => {
			if (settled) return;
			settled = true;
			this.reserved -= estimateUsd;
			this.rollover();
			const actual =
				usage && typeof usage.input_tokens === 'number'
					? this.cost(usage.input_tokens, usage.output_tokens ?? 0)
					: estimateUsd;
			this.ledger.spentUsd += actual;
			this.ledger.calls++;
			this.ledger.days[this.day()] = (this.ledger.days[this.day()] ?? 0) + actual;
			this.save();
			this.warn();
		};
	}

	private warn() {
		const share = this.ledger.spentUsd / this.opts.monthlyUsd;
		for (const mark of [0.5, 0.8, 0.95]) {
			if (share >= mark && !this.warned.has(mark)) {
				this.warned.add(mark);
				console.warn(
					`[budget] Jev spend for ${this.ledger.month} is $${this.ledger.spentUsd.toFixed(4)} ` +
						`(${Math.round(share * 100)}% of $${this.opts.monthlyUsd})`
				);
			}
		}
	}

	status() {
		this.rollover();
		return {
			month: this.ledger.month,
			spentUsd: this.ledger.spentUsd,
			monthlyUsd: this.opts.monthlyUsd,
			today: this.ledger.days[this.day()] ?? 0,
			dailyUsd: this.opts.dailyUsd,
			calls: this.ledger.calls,
			refused: this.ledger.refused
		};
	}
}
