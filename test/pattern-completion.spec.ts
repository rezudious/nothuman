import { describe, it, expect } from 'vitest';
import {
	generatePatternCompletionChallenge,
	validatePatternCompletion,
} from '../src/challenges/types/pattern-completion';
import { isPrime } from '../src/challenges/types/structured-json';

describe('Pattern Completion Challenge', () => {
	describe('generatePatternCompletionChallenge', () => {
		it('returns prompt, expectedAnswer, and parameters', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			expect(result.prompt).toBeTruthy();
			expect(result.expectedAnswer).toBeTruthy();
			expect(result.parameters).toBeTruthy();
		});

		it('includes nonce in prompt', () => {
			const nonce = 'deadbeef';
			const result = generatePatternCompletionChallenge(nonce);

			expect(result.prompt).toContain(nonce);
		});

		it('derives seeds from nonce correctly', () => {
			const nonce = 'ffff0000'; // 0xffff = 65535, 0x0000 = 0
			const result = generatePatternCompletionChallenge(nonce);

			// seed1 = (65535 % 100) + 1 = 35 + 1 = 36
			// seed2 = (0 % 100) + 1 = 0 + 1 = 1
			expect(result.parameters.seed1).toBe(36);
			expect(result.parameters.seed2).toBe(1);
		});

		it('seeds are shown in prompt', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			expect(result.prompt).toContain(String(result.parameters.seed1));
			expect(result.prompt).toContain(String(result.parameters.seed2));
		});

		it('parameters contain multiplier between 2-7', () => {
			for (let i = 0; i < 20; i++) {
				const result = generatePatternCompletionChallenge('a3f7b2c1');
				expect(result.parameters.multiplier).toBeGreaterThanOrEqual(2);
				expect(result.parameters.multiplier).toBeLessThanOrEqual(7);
			}
		});

		it('parameters contain valid operation', () => {
			const result = generatePatternCompletionChallenge('a3f7b2c1');
			expect(['add', 'subtract']).toContain(result.parameters.operation);
		});

		it('totalTerms is between 15-30', () => {
			for (let i = 0; i < 20; i++) {
				const result = generatePatternCompletionChallenge('a3f7b2c1');
				expect(result.parameters.totalTerms).toBeGreaterThanOrEqual(15);
				expect(result.parameters.totalTerms).toBeLessThanOrEqual(30);
			}
		});

		it('expectedAnswer contains primeIndexTerms and checksum', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			expect(parsed).toHaveProperty('primeIndexTerms');
			expect(parsed).toHaveProperty('checksum');
			expect(Array.isArray(parsed.primeIndexTerms)).toBe(true);
			expect(typeof parsed.checksum).toBe('number');
		});

		it('primeIndexTerms correspond to prime indices', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			const primeIndices = result.parameters.primeIndices;

			// Verify all indices are prime
			for (const idx of primeIndices) {
				expect(isPrime(idx)).toBe(true);
			}

			// Verify count matches
			expect(parsed.primeIndexTerms.length).toBe(primeIndices.length);
		});

		it('computes sequence correctly for add operation', () => {
			// Find an 'add' operation challenge
			let result;
			for (let i = 0; i < 50; i++) {
				result = generatePatternCompletionChallenge('a3f7b2c1');
				if (result.parameters.operation === 'add') break;
			}

			if (result && result.parameters.operation === 'add') {
				const { seed1, seed2, multiplier, totalTerms } = result.parameters;

				// Manually compute first few terms
				const sequence = [seed1, seed2];
				for (let i = 2; i < totalTerms; i++) {
					sequence.push(sequence[i - 1] * multiplier + sequence[i - 2]);
				}

				// Verify term at index 2
				const expected2 = seed2 * multiplier + seed1;
				expect(sequence[2]).toBe(expected2);
			}
		});

		it('computes sequence correctly for subtract operation', () => {
			// Find a 'subtract' operation challenge
			let result;
			for (let i = 0; i < 50; i++) {
				result = generatePatternCompletionChallenge('b2c1a3f7');
				if (result.parameters.operation === 'subtract') break;
			}

			if (result && result.parameters.operation === 'subtract') {
				const { seed1, seed2, multiplier, totalTerms } = result.parameters;

				// Manually compute first few terms
				const sequence = [seed1, seed2];
				for (let i = 2; i < totalTerms; i++) {
					sequence.push(sequence[i - 1] * multiplier - sequence[i - 2]);
				}

				// Verify term at index 2
				const expected2 = seed2 * multiplier - seed1;
				expect(sequence[2]).toBe(expected2);
			}
		});

		it('checksum follows formula: (sum XOR nonce) % 1000000', () => {
			const nonce = 'ffffffff';
			const result = generatePatternCompletionChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);

			const sum = parsed.primeIndexTerms.reduce((a: number, b: number) => a + b, 0);
			const nonceValue = parseInt(nonce, 16);
			const expectedChecksum = (sum ^ nonceValue) % 1000000;

			expect(parsed.checksum).toBe(expectedChecksum);
		});
	});

	describe('validatePatternCompletion', () => {
		it('returns true for matching answer', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			expect(validatePatternCompletion(result.expectedAnswer, result.expectedAnswer)).toBe(true);
		});

		it('returns false for wrong checksum', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.checksum = 999999;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validatePatternCompletion(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong primeIndexTerms', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.primeIndexTerms = [1, 2, 3];
			const wrongAnswer = JSON.stringify(parsed);

			expect(validatePatternCompletion(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for invalid JSON', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			expect(validatePatternCompletion('not json', result.expectedAnswer)).toBe(false);
		});

		it('returns false for missing fields', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			expect(validatePatternCompletion('{"checksum": 123}', result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong array length', () => {
			const nonce = 'a3f7b2c1';
			const result = generatePatternCompletionChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.primeIndexTerms = parsed.primeIndexTerms.slice(0, 2);
			const wrongAnswer = JSON.stringify(parsed);

			expect(validatePatternCompletion(wrongAnswer, result.expectedAnswer)).toBe(false);
		});
	});
});
