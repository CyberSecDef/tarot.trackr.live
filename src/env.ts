import { defineEnvVars } from '@sveltejs/kit/env';

function positiveInt(name: string, fallback: number) {
	return (value: string | undefined) => {
		if (value === undefined || value === '') return fallback;
		const n = Number(value);
		if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
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
	READING_RATE_LIMIT: {
		description: 'Readings allowed per client IP per minute.',
		schema: positiveInt('READING_RATE_LIMIT', 10)
	}
});
