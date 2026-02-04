import { describe, it, expect } from 'vitest';
import {
	generateComputationalArrayChallenge,
	validateComputationalArray,
} from '../src/challenges/types/computational-array';
import { isPrime } from '../src/challenges/types/structured-json';

describe('Computational Array Challenge', () => {
	describe('generateComputationalArrayChallenge', () => {
		it('returns prompt, expectedAnswer, and parameters', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			expect(result.prompt).toBeTruthy();
			expect(result.expectedAnswer).toBeTruthy();
			expect(result.parameters).toBeTruthy();
		});

		it('includes nonce in prompt', () => {
			const nonce = 'deadbeef';
			const result = generateComputationalArrayChallenge(nonce);

			expect(result.prompt).toContain(nonce);
			expect(result.prompt).toContain('0xdeadbeef');
		});

		it('generates array with 300-600 elements', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			expect(result.parameters.arrayLength).toBeGreaterThanOrEqual(300);
			expect(result.parameters.arrayLength).toBeLessThanOrEqual(600);
			expect(result.parameters.array).toHaveLength(result.parameters.arrayLength);
		});

		it('array values are between 1 and 2000', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			for (const num of result.parameters.array) {
				expect(num).toBeGreaterThanOrEqual(1);
				expect(num).toBeLessThanOrEqual(2000);
			}
		});

		it('expectedAnswer is valid JSON with all required fields', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			expect(parsed).toHaveProperty('primeIndices');
			expect(parsed).toHaveProperty('sumOfPrimes');
			expect(parsed).toHaveProperty('evenCount');
			expect(parsed).toHaveProperty('maxPrime');
			expect(parsed).toHaveProperty('checksum');

			expect(Array.isArray(parsed.primeIndices)).toBe(true);
			expect(typeof parsed.sumOfPrimes).toBe('number');
			expect(typeof parsed.evenCount).toBe('number');
			expect(typeof parsed.checksum).toBe('number');
		});

		it('computes correct primeIndices', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);
			const array = result.parameters.array;

			// Verify each prime index
			for (const idx of parsed.primeIndices) {
				expect(isPrime(array[idx])).toBe(true);
			}

			// Verify no primes are missed
			for (let i = 0; i < array.length; i++) {
				if (isPrime(array[i])) {
					expect(parsed.primeIndices).toContain(i);
				}
			}
		});

		it('computes correct sumOfPrimes', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);
			const array = result.parameters.array;

			const expectedSum = array.filter((n) => isPrime(n)).reduce((a, b) => a + b, 0);
			expect(parsed.sumOfPrimes).toBe(expectedSum);
		});

		it('computes correct evenCount', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);
			const array = result.parameters.array;

			const expectedCount = array.filter((n) => n % 2 === 0).length;
			expect(parsed.evenCount).toBe(expectedCount);
		});

		it('computes correct maxPrime', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);
			const array = result.parameters.array;

			const primes = array.filter((n) => isPrime(n));
			const expectedMax = primes.length > 0 ? Math.max(...primes) : null;
			expect(parsed.maxPrime).toBe(expectedMax);
		});

		it('computes correct checksum with nonce', () => {
			const nonce = 'ffffffff';
			const result = generateComputationalArrayChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);
			const array = result.parameters.array;

			// Compute XOR of primes
			let xorOfPrimes = 0;
			for (const num of array) {
				if (isPrime(num)) {
					xorOfPrimes ^= num;
				}
			}

			const nonceValue = parseInt(nonce, 16);
			const expectedChecksum = (xorOfPrimes ^ nonceValue) % 1000000;
			expect(parsed.checksum).toBe(expectedChecksum);
		});

		it('checksum varies with different nonces', () => {
			const result1 = generateComputationalArrayChallenge('00000000');
			const result2 = generateComputationalArrayChallenge('ffffffff');

			// Use same array for fair comparison
			const array = result1.parameters.array;

			// Compute XOR of primes
			let xorOfPrimes = 0;
			for (const num of array) {
				if (isPrime(num)) {
					xorOfPrimes ^= num;
				}
			}

			const checksum1 = (xorOfPrimes ^ 0x00000000) % 1000000;
			const checksum2 = (xorOfPrimes ^ 0xffffffff) % 1000000;

			// Checksums should differ (unless xorOfPrimes happens to make them equal, which is unlikely)
			expect(checksum1).not.toBe(checksum2);
		});
	});

	describe('validateComputationalArray', () => {
		it('returns true for matching answer', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			expect(validateComputationalArray(result.expectedAnswer, result.expectedAnswer)).toBe(true);
		});

		it('returns false for wrong checksum', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.checksum = 999999;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateComputationalArray(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong sumOfPrimes', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.sumOfPrimes = 0;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateComputationalArray(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong evenCount', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.evenCount = 0;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateComputationalArray(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong maxPrime', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.maxPrime = 1;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateComputationalArray(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong primeIndices', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.primeIndices = [0, 1, 2];
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateComputationalArray(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for invalid JSON', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			expect(validateComputationalArray('not json', result.expectedAnswer)).toBe(false);
		});

		it('returns false for missing fields', () => {
			const nonce = 'a3f7b2c1';
			const result = generateComputationalArrayChallenge(nonce);

			expect(validateComputationalArray('{"checksum": 123}', result.expectedAnswer)).toBe(false);
		});
	});
});
