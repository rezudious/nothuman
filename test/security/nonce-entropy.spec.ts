import { describe, it, expect } from 'vitest';
import { generateNonce } from '../../src/utils/nonce';

describe('Security: Nonce Entropy', () => {
	describe('Nonce Length (Entropy)', () => {
		it('generates nonces with at least 128 bits of entropy (32 hex chars)', () => {
			const nonce = generateNonce();

			// 128 bits = 16 bytes = 32 hex characters
			// Current implementation uses only 4 bytes (32 bits) which is insufficient
			expect(nonce.length).toBeGreaterThanOrEqual(32);
		});

		it('generates nonces with only hex characters', () => {
			const nonce = generateNonce();
			expect(nonce).toMatch(/^[0-9a-f]+$/i);
		});

		it('generates unique nonces across 10000 generations', () => {
			const nonces = new Set<string>();

			for (let i = 0; i < 10000; i++) {
				const nonce = generateNonce();
				nonces.add(nonce);
			}

			// All 10000 should be unique
			expect(nonces.size).toBe(10000);
		});

		it('nonces have sufficient collision resistance', () => {
			// With 128 bits of entropy, the probability of collision in 10000 samples
			// is astronomically low (~10^-31). With 32 bits, collision is likely.
			const nonces: string[] = [];

			for (let i = 0; i < 10000; i++) {
				nonces.push(generateNonce());
			}

			// Check for any duplicates
			const uniqueNonces = new Set(nonces);
			expect(uniqueNonces.size).toBe(nonces.length);
		});
	});

	describe('Nonce Cryptographic Quality', () => {
		it('produces statistically random output', () => {
			// Generate many nonces and check bit distribution
			const nonces: string[] = [];
			for (let i = 0; i < 1000; i++) {
				nonces.push(generateNonce());
			}

			// Count occurrences of each hex digit
			const hexCounts: Record<string, number> = {};
			for (const nonce of nonces) {
				for (const char of nonce) {
					hexCounts[char] = (hexCounts[char] || 0) + 1;
				}
			}

			// Each hex digit should appear roughly equally (within 30% of expected)
			const totalChars = nonces.join('').length;
			const expectedPerDigit = totalChars / 16;
			const tolerance = expectedPerDigit * 0.3;

			for (const digit of '0123456789abcdef') {
				const count = hexCounts[digit] || 0;
				expect(count).toBeGreaterThan(expectedPerDigit - tolerance);
				expect(count).toBeLessThan(expectedPerDigit + tolerance);
			}
		});

		it('does not produce predictable patterns', () => {
			// Generate consecutive nonces and verify no obvious patterns
			const nonces: string[] = [];
			for (let i = 0; i < 100; i++) {
				nonces.push(generateNonce());
			}

			// Calculate average same-position matches across all consecutive pairs
			let totalSamePositionRatio = 0;
			for (let i = 1; i < nonces.length; i++) {
				const prev = nonces[i - 1];
				const curr = nonces[i];

				let samePositionChars = 0;
				const minLen = Math.min(prev.length, curr.length);
				for (let j = 0; j < minLen; j++) {
					if (prev[j] === curr[j]) {
						samePositionChars++;
					}
				}

				totalSamePositionRatio += samePositionChars / minLen;
			}

			// Average ratio should be around 1/16 (6.25%) for truly random hex
			// Allow up to 15% to account for statistical variance
			const avgRatio = totalSamePositionRatio / (nonces.length - 1);
			expect(avgRatio).toBeLessThan(0.15);
		});
	});

	describe('Pre-computation Attack Resistance', () => {
		it('nonce space is too large for practical pre-computation', () => {
			// With 128 bits (32 hex chars), there are 16^32 = 2^128 possible nonces
			// This is computationally infeasible to pre-compute
			const nonce = generateNonce();

			// Verify we have at least 128 bits = 32 hex characters
			// 32 bits (8 hex chars) is vulnerable to pre-computation attacks
			const bits = nonce.length * 4; // 4 bits per hex char
			expect(bits).toBeGreaterThanOrEqual(128);
		});
	});
});
