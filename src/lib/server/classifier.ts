import { join } from 'node:path';
import {
	JEV_DAILY_BUDGET_USD,
	JEV_MONTHLY_BUDGET_USD,
	JEV_PRICE_INPUT_PER_MTOK,
	JEV_PRICE_OUTPUT_PER_MTOK,
	TAROT_DATA_DIR,
	TYPESAFE_API_KEY,
	TYPESAFE_BASE_URL,
	TYPESAFE_MODEL
} from '$app/env/private';
import { JevBudget } from './budget.js';
import { FallbackClassifier, type Classifier } from './classify.js';
import { JevClassifier } from './jev.js';

/** Hard spend ceiling for every Jev call this process makes. */
export const budget = new JevBudget({
	monthlyUsd: JEV_MONTHLY_BUDGET_USD,
	dailyUsd: JEV_DAILY_BUDGET_USD || JEV_MONTHLY_BUDGET_USD / 10,
	inputPerMTok: JEV_PRICE_INPUT_PER_MTOK,
	outputPerMTok: JEV_PRICE_OUTPUT_PER_MTOK,
	path: join(TAROT_DATA_DIR, 'jev-usage.json')
});

/** The app-wide classifier: Jev when a key is configured, otherwise the fallback. */
export const classifier: Classifier = TYPESAFE_API_KEY
	? new JevClassifier({
			apiKey: TYPESAFE_API_KEY,
			baseUrl: TYPESAFE_BASE_URL,
			model: TYPESAFE_MODEL,
			budget
		})
	: new FallbackClassifier();

if (!TYPESAFE_API_KEY) {
	console.warn('[tarot] TYPESAFE_API_KEY is not set; readings will use fallback classification');
} else {
	const s = budget.status();
	console.info(
		`[tarot] Jev budget: $${s.spentUsd.toFixed(4)} of $${s.monthlyUsd} spent in ${s.month}; ` +
			`daily cap $${s.dailyUsd}`
	);
}
