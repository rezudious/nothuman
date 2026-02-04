import { describe, it, expect } from 'vitest';
import { generateVerificationToken, validateVerificationToken } from '../src/auth/token';

const TEST_SECRET = 'test-secret-for-jwt-signing-min-32-chars';

describe('JWT Token', () => {
	describe('generateVerificationToken', () => {
		it('generates a valid JWT token', async () => {
			const token = await generateVerificationToken(
				{
					challengeId: 'test-challenge-id',
					challengeType: 'structured_json',
					solveTimeMs: 1500,
				},
				TEST_SECRET
			);

			expect(token).toBeTruthy();
			expect(typeof token).toBe('string');
			expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
		});

		it('token can be validated', async () => {
			const token = await generateVerificationToken(
				{
					challengeId: 'test-challenge-id',
					challengeType: 'computational_array',
					solveTimeMs: 2000,
				},
				TEST_SECRET
			);

			const result = await validateVerificationToken(token, TEST_SECRET);

			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.payload.sub).toBe('ai_verification');
				expect(result.payload.challenge_id).toBe('test-challenge-id');
				expect(result.payload.challenge_type).toBe('computational_array');
				expect(result.payload.solve_time_ms).toBe(2000);
				expect(result.payload.issuer).toBe('nothuman.dev');
			}
		});
	});

	describe('validateVerificationToken', () => {
		it('returns valid for correct token', async () => {
			const token = await generateVerificationToken(
				{
					challengeId: 'abc123',
					challengeType: 'structured_json',
					solveTimeMs: 500,
				},
				TEST_SECRET
			);

			const result = await validateVerificationToken(token, TEST_SECRET);

			expect(result.valid).toBe(true);
		});

		it('returns invalid for wrong secret', async () => {
			const token = await generateVerificationToken(
				{
					challengeId: 'abc123',
					challengeType: 'structured_json',
					solveTimeMs: 500,
				},
				TEST_SECRET
			);

			const result = await validateVerificationToken(token, 'wrong-secret-that-is-32-chars-long');

			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.error).toBe('Invalid signature');
			}
		});

		it('returns invalid for malformed token', async () => {
			const result = await validateVerificationToken('not-a-valid-jwt', TEST_SECRET);

			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.error).toBe('Invalid token format');
			}
		});

		it('returns invalid for empty token', async () => {
			const result = await validateVerificationToken('', TEST_SECRET);

			expect(result.valid).toBe(false);
		});

		it('includes iat and exp in payload', async () => {
			const token = await generateVerificationToken(
				{
					challengeId: 'test-id',
					challengeType: 'structured_json',
					solveTimeMs: 100,
				},
				TEST_SECRET
			);

			const result = await validateVerificationToken(token, TEST_SECRET);

			expect(result.valid).toBe(true);
			if (result.valid) {
				expect(result.payload.iat).toBeDefined();
				expect(result.payload.exp).toBeDefined();
				expect(result.payload.exp).toBeGreaterThan(result.payload.iat);
				// exp should be 1 hour after iat
				expect(result.payload.exp - result.payload.iat).toBe(3600);
			}
		});
	});
});
