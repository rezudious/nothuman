import { describe, it, expect } from 'vitest';
import {
	isPrime,
	isEven,
	isOdd,
	isFibonacci,
	generateStructuredJsonChallenge,
	validateStructuredJson,
} from '../src/challenges/types/structured-json';

describe('Helper Functions', () => {
	describe('isPrime', () => {
		it('returns false for numbers less than 2', () => {
			expect(isPrime(0)).toBe(false);
			expect(isPrime(1)).toBe(false);
			expect(isPrime(-5)).toBe(false);
		});

		it('returns true for prime numbers', () => {
			expect(isPrime(2)).toBe(true);
			expect(isPrime(3)).toBe(true);
			expect(isPrime(5)).toBe(true);
			expect(isPrime(7)).toBe(true);
			expect(isPrime(11)).toBe(true);
			expect(isPrime(13)).toBe(true);
			expect(isPrime(17)).toBe(true);
			expect(isPrime(19)).toBe(true);
			expect(isPrime(23)).toBe(true);
			expect(isPrime(29)).toBe(true);
			expect(isPrime(31)).toBe(true);
		});

		it('returns false for non-prime numbers', () => {
			expect(isPrime(4)).toBe(false);
			expect(isPrime(6)).toBe(false);
			expect(isPrime(8)).toBe(false);
			expect(isPrime(9)).toBe(false);
			expect(isPrime(10)).toBe(false);
			expect(isPrime(15)).toBe(false);
			expect(isPrime(21)).toBe(false);
		});
	});

	describe('isEven', () => {
		it('returns true for even numbers', () => {
			expect(isEven(0)).toBe(true);
			expect(isEven(2)).toBe(true);
			expect(isEven(4)).toBe(true);
			expect(isEven(100)).toBe(true);
		});

		it('returns false for odd numbers', () => {
			expect(isEven(1)).toBe(false);
			expect(isEven(3)).toBe(false);
			expect(isEven(99)).toBe(false);
		});
	});

	describe('isOdd', () => {
		it('returns true for odd numbers', () => {
			expect(isOdd(1)).toBe(true);
			expect(isOdd(3)).toBe(true);
			expect(isOdd(99)).toBe(true);
		});

		it('returns false for even numbers', () => {
			expect(isOdd(0)).toBe(false);
			expect(isOdd(2)).toBe(false);
			expect(isOdd(100)).toBe(false);
		});
	});

	describe('isFibonacci', () => {
		it('returns true for Fibonacci numbers', () => {
			const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21];
			for (const n of fibs) {
				expect(isFibonacci(n)).toBe(true);
			}
		});

		it('returns false for non-Fibonacci numbers', () => {
			expect(isFibonacci(4)).toBe(false);
			expect(isFibonacci(6)).toBe(false);
			expect(isFibonacci(7)).toBe(false);
			expect(isFibonacci(9)).toBe(false);
			expect(isFibonacci(10)).toBe(false);
		});
	});
});

describe('Structured JSON Challenge', () => {
	describe('generateStructuredJsonChallenge', () => {
		it('returns prompt, expectedAnswer, and parameters', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(result.prompt).toBeTruthy();
			expect(result.expectedAnswer).toBeTruthy();
			expect(result.parameters).toBeTruthy();
		});

		it('includes nonce in prompt', () => {
			const nonce = 'deadbeef';
			const result = generateStructuredJsonChallenge(nonce);

			expect(result.prompt).toContain(nonce);
			expect(result.prompt).toContain('0xdead'); // hex prefix of first 4 chars
		});

		it('parameters contain year between 2020-2030', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(result.parameters.year).toBeGreaterThanOrEqual(2020);
			expect(result.parameters.year).toBeLessThanOrEqual(2030);
		});

		it('parameters contain exactly 2 properties', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(result.parameters.properties).toHaveLength(2);
			const validProps = ['isPrime', 'isEven', 'isOdd', 'isFibonacci'];
			for (const prop of result.parameters.properties) {
				expect(validProps).toContain(prop);
			}
		});

		it('expectedAnswer is valid JSON with calendar and checksum', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			expect(parsed).toHaveProperty('calendar');
			expect(parsed).toHaveProperty('checksum');
			expect(typeof parsed.checksum).toBe('number');
		});

		it('calendar has all 12 months', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

			for (const month of months) {
				expect(parsed.calendar).toHaveProperty(month);
				expect(Array.isArray(parsed.calendar[month])).toBe(true);
			}
		});

		it('handles leap year correctly for February', () => {
			// 2024 is a leap year
			let result;
			for (let i = 0; i < 50; i++) {
				result = generateStructuredJsonChallenge('a3f7b2c1');
				if (result.parameters.year === 2024) break;
			}

			if (result && result.parameters.year === 2024) {
				const parsed = JSON.parse(result.expectedAnswer);
				expect(parsed.calendar.feb).toHaveLength(29);
			}
		});

		it('checksum follows formula: (primeCount * nonceHex) % 100000', () => {
			const nonce = 'ffff0000'; // 0xffff = 65535
			const result = generateStructuredJsonChallenge(nonce);
			const parsed = JSON.parse(result.expectedAnswer);

			// Count primes in all months (prime days: 2,3,5,7,11,13,17,19,23,29,31)
			// Each month has different days, but primes up to 28 appear in all months
			// That's 2,3,5,7,11,13,17,19,23 = 9 primes in every month
			// Months with 29 days add 1 prime (29)
			// Months with 31 days add 2 primes (29, 31)

			// Let's verify by counting
			let primeCount = 0;
			for (const month of Object.values(parsed.calendar) as any[]) {
				for (const day of month) {
					if (isPrime(day.day)) primeCount++;
				}
			}

			const expectedChecksum = (primeCount * 0xffff) % 100000;
			expect(parsed.checksum).toBe(expectedChecksum);
		});
	});

	describe('validateStructuredJson', () => {
		it('returns true for matching answer', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(validateStructuredJson(result.expectedAnswer, result.expectedAnswer)).toBe(true);
		});

		it('returns false for wrong checksum', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.checksum = 99999;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateStructuredJson(wrongAnswer, result.expectedAnswer)).toBe(false);
		});

		it('returns false for invalid JSON', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(validateStructuredJson('not json', result.expectedAnswer)).toBe(false);
		});

		it('returns false for missing calendar', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			expect(validateStructuredJson('{"checksum": 123}', result.expectedAnswer)).toBe(false);
		});

		it('returns false for wrong day values', () => {
			const nonce = 'a3f7b2c1';
			const result = generateStructuredJsonChallenge(nonce);

			const parsed = JSON.parse(result.expectedAnswer);
			parsed.calendar.jan[0].day = 999;
			const wrongAnswer = JSON.stringify(parsed);

			expect(validateStructuredJson(wrongAnswer, result.expectedAnswer)).toBe(false);
		});
	});
});
