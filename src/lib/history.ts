/**
 * Recent readings, kept only in this browser. Every access is guarded:
 * storage can be blocked (private mode, disabled site data) and the app must
 * work exactly the same without it.
 */
export interface HistoryEntry {
	path: string;
	spread: string;
	cards: string[];
	at: number;
}

const KEY = 'tarot.history.v1';
const MAX = 24;

export function loadHistory(): HistoryEntry[] {
	try {
		const raw = localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed.filter((e) => typeof e?.path === 'string') : [];
	} catch {
		return [];
	}
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
	const next = [entry, ...loadHistory().filter((e) => e.path !== entry.path)].slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* storage unavailable: history simply isn't kept */
	}
	return next;
}

export function clearHistory(): void {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* nothing to clear */
	}
}
