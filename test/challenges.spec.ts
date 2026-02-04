import { describe, it, expect } from 'vitest';
import { generateNonce } from '../src/utils/nonce';
import { generateChallenge, generateChallengeOfType } from '../src/challenges/generator';

describe('Nonce Generation', () => {
	it('generates 8-character hex string', () => {
		const nonce = generateNonce();
		expect(nonce).toHaveLength(8);
		expect(nonce).toMatch(/^[0-9a-f]{8}$/);
	});

	it('generates unique nonces', () => {
		const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
		expect(nonces.size).toBe(100);
	});
});

describe('Challenge Generation', () => {
	describe('generateChallenge', () => {
		it('returns valid challenge structure', () => {
			const challenge = generateChallenge();

			expect(challenge.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
			expect(['structured_json', 'computational_array']).toContain(challenge.type);
			expect(challenge.prompt).toBeTruthy();
			expect(challenge.expectedAnswer).toBeTruthy();
			expect(challenge.nonce).toHaveLength(8);
			expect(challenge.createdAt).toBeGreaterThan(0);
			expect(challenge.expiresAt).toBeGreaterThan(challenge.createdAt);
		});

		it('includes nonce in prompt', () => {
			const challenge = generateChallenge();
			expect(challenge.prompt).toContain(challenge.nonce);
		});

		it('sets expiry 3 seconds after creation', () => {
			const challenge = generateChallenge();
			const ttl = challenge.expiresAt - challenge.createdAt;
			expect(ttl).toBe(3000);
		});
	});

	describe('generateChallengeOfType', () => {
		it('generates structured_json challenge', () => {
			const challenge = generateChallengeOfType('structured_json');
			expect(challenge.type).toBe('structured_json');
			expect(challenge.prompt).toContain('calendar');
			expect(JSON.parse(challenge.expectedAnswer)).toHaveProperty('checksum');
		});

		it('generates computational_array challenge', () => {
			const challenge = generateChallengeOfType('computational_array');
			expect(challenge.type).toBe('computational_array');
			expect(challenge.prompt).toContain('array');

			const answer = JSON.parse(challenge.expectedAnswer);
			expect(answer).toHaveProperty('result');
			expect(answer).toHaveProperty('nonce');
		});

		it('throws for unknown type', () => {
			expect(() => generateChallengeOfType('unknown' as any)).toThrow('Unknown challenge type');
		});
	});

	describe('structured_json challenges', () => {
		it('produces parseable JSON expectedAnswer with calendar and checksum', () => {
			const challenge = generateChallengeOfType('structured_json');
			const parsed = JSON.parse(challenge.expectedAnswer);
			expect(parsed).toHaveProperty('calendar');
			expect(parsed).toHaveProperty('checksum');
		});

		it('has parameters with year and properties', () => {
			const challenge = generateChallengeOfType('structured_json');
			expect(challenge.parameters).toHaveProperty('year');
			expect(challenge.parameters).toHaveProperty('properties');
			expect(Array.isArray((challenge.parameters as any).properties)).toBe(true);
		});
	});

	describe('computational_array challenges', () => {
		it('produces correct sum result', () => {
			// Generate until we get a sum operation
			let challenge;
			for (let i = 0; i < 50; i++) {
				challenge = generateChallengeOfType('computational_array');
				if ((challenge.parameters as any)?.operation === 'sum') break;
			}

			if ((challenge!.parameters as any)?.operation === 'sum') {
				const numbers = (challenge!.parameters as any).numbers as number[];
				const answer = JSON.parse(challenge!.expectedAnswer);
				expect(answer.result).toBe(numbers.reduce((a, b) => a + b, 0));
			}
		});

		it('has parameters with numbers and operation', () => {
			const challenge = generateChallengeOfType('computational_array');
			expect(challenge.parameters).toHaveProperty('numbers');
			expect(challenge.parameters).toHaveProperty('operation');
		});
	});
});
