export const MAX_QUESTION = 500;

/**
 * Normalise a user's question before it goes anywhere near Jev.
 *
 * Control characters go (Unicode Cc and Cf, which covers bidi overrides and
 * zero-width tricks), whitespace collapses, and the result is cut at
 * MAX_QUESTION code points. The text is still untrusted afterwards: it only
 * ever travels to Jev as state, never as instructions.
 */
export function cleanQuestion(input: unknown): string {
	if (typeof input !== 'string') return '';
	const stripped = input.normalize('NFC').replace(/[\p{Cc}\p{Cf}]/gu, ' ');
	const collapsed = stripped.replace(/\s+/g, ' ').trim();
	return Array.from(collapsed).slice(0, MAX_QUESTION).join('');
}
