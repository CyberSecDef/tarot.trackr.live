import { createCipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Seeded randomness for readings.
 *
 * A reading has to be unpredictable when it is drawn and exactly reproducible
 * when a share link is opened. So every reading starts from a fresh 128-bit
 * seed out of the OS CSPRNG, and everything random after that (shuffle,
 * reversals, fragment picks) comes from a ChaCha20 keystream keyed on that
 * seed. Same seed, same stream; nobody can predict a stream without its seed.
 *
 * Streams are separated by purpose (`draw`, `assembly`, ...) so adding a
 * random choice in one place never shifts the draws made in another, which
 * would silently change every existing share link.
 */

const SEED_BYTES = 16;
const SEED_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const CHUNK = 4096;

export function newSeed(): string {
	return randomBytes(SEED_BYTES).toString('base64url');
}

export function isSeed(value: unknown): value is string {
	return typeof value === 'string' && SEED_PATTERN.test(value);
}

export class Stream {
	private cipher;
	private buffer = Buffer.alloc(0);
	private offset = 0;

	constructor(seed: string, purpose: string) {
		if (!isSeed(seed)) throw new Error('invalid seed');
		const key = createHash('sha256').update(`tarot:${purpose}:${seed}`).digest();
		// Node's chacha20 takes a 16-byte IV (counter + nonce). The key already
		// differs per seed and purpose, so a fixed IV is safe here.
		this.cipher = createCipheriv('chacha20', key, Buffer.alloc(16));
	}

	private uint32(): number {
		if (this.offset + 4 > this.buffer.length) {
			this.buffer = this.cipher.update(Buffer.alloc(CHUNK));
			this.offset = 0;
		}
		const value = this.buffer.readUInt32LE(this.offset);
		this.offset += 4;
		return value;
	}

	/** Uniform integer in [0, n). Rejection sampling, so there is no modulo bias. */
	int(n: number): number {
		if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) throw new RangeError(`bad range ${n}`);
		const limit = Math.floor(2 ** 32 / n) * n;
		let value = this.uint32();
		while (value >= limit) value = this.uint32();
		return value % n;
	}

	bool(): boolean {
		return this.int(2) === 1;
	}

	pick<T>(items: readonly T[]): T {
		return items[this.int(items.length)];
	}

	/** Fisher–Yates, in place. */
	shuffle<T>(items: T[]): T[] {
		for (let i = items.length - 1; i > 0; i--) {
			const j = this.int(i + 1);
			[items[i], items[j]] = [items[j], items[i]];
		}
		return items;
	}
}
