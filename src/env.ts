import { defineEnvVars } from '@sveltejs/kit/env';

function positiveInt(name: string, fallback: number) {
	return (value: string | undefined) => {
		if (value === undefined || value === '') return fallback;
		const n = Number(value);
		if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
		return n;
	};
}

function positiveNumber(name: string, fallback: number) {
	return (value: string | undefined) => {
		if (value === undefined || value === '') return fallback;
		const n = Number(value);
		if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`);
		return n;
	};
}

function optional(fallback: string) {
	return (value: string | undefined) => (value === undefined || value === '' ? fallback : value);
}

export const variables = defineEnvVars({
	TYPESAFE_API_KEY: {
		description: 'TypeSafe API key for Jev. Without it, readings use the fallback classification.',
		schema: optional('')
	},
	TYPESAFE_BASE_URL: {
		description: 'TypeSafe API base URL.',
		schema: optional('https://api.typesafe.ai/v1')
	},
	TYPESAFE_MODEL: {
		description: 'Jev model alias or pinned version.',
		schema: optional('jev-latest')
	},
	JEV_MONTHLY_BUDGET_USD: {
		description: 'Hard ceiling on Jev spend per UTC month. Over it, readings use the fallback.',
		schema: positiveNumber('JEV_MONTHLY_BUDGET_USD', 10)
	},
	JEV_DAILY_BUDGET_USD: {
		description:
			'Ceiling per UTC day, so one bad day cannot spend the month. Default: a tenth of the month.',
		schema: positiveNumber('JEV_DAILY_BUDGET_USD', 0)
	},
	JEV_PRICE_INPUT_PER_MTOK: {
		description: 'USD per million Jev input tokens.',
		schema: positiveNumber('JEV_PRICE_INPUT_PER_MTOK', 0.042)
	},
	JEV_PRICE_OUTPUT_PER_MTOK: {
		description: 'USD per million Jev output tokens.',
		schema: positiveNumber('JEV_PRICE_OUTPUT_PER_MTOK', 0)
	},
	TAROT_DATA_DIR: {
		description: 'Directory for runtime state (the Jev spend ledger). Must survive deploys.',
		schema: optional('data')
	},
	TRUSTED_PROXIES: {
		description:
			'Comma-separated socket addresses allowed to connect (the reverse proxy). Empty allows everyone.',
		schema: optional('')
	},
	READING_RATE_LIMIT: {
		description: 'Readings allowed per client IP per minute.',
		schema: positiveInt('READING_RATE_LIMIT', 10)
	}
});
