import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { generateConstraintTextChallenge, generatePhraseFromNonce } from '../../src/challenges/types/constraint-text';

/**
 * Helper to generate a valid solution for constraint_text challenge.
 * The solution must be words where first letters spell out the phrase.
 */
function generateValidSolution(phrase: string): string {
	// Generate words where first letter of each word matches the phrase
	// Use simple words starting with each letter
	const wordMap: Record<string, string> = {
		A: 'Apple',
		B: 'Ball',
		C: 'Cat',
		D: 'Dog',
		E: 'Elephant',
		F: 'Fish',
		G: 'Goat',
		H: 'House',
		I: 'Ice',
		J: 'Jam',
		K: 'Kite',
		L: 'Lion',
		M: 'Moon',
		N: 'Nest',
		O: 'Orange',
		P: 'Pen',
		Q: 'Queen',
		R: 'Rain',
		S: 'Sun',
		T: 'Tree',
		U: 'Umbrella',
		V: 'Van',
		W: 'Water',
		X: 'Xray',
		Y: 'Yellow',
		Z: 'Zebra',
	};

	return phrase
		.split('')
		.map((char) => wordMap[char.toUpperCase()] || 'Word')
		.join(' ');
}

describe('Security: Race Condition Prevention', () => {
	beforeAll(async () => {
		// Set up database tables
		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS challenges (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				prompt TEXT NOT NULL,
				expected_answer TEXT NOT NULL,
				nonce TEXT NOT NULL,
				parameters TEXT,
				created_at INTEGER NOT NULL,
				expires_at INTEGER NOT NULL,
				solved INTEGER DEFAULT 0,
				solved_at INTEGER,
				solve_time_ms INTEGER
			)
		`).run();

		await env.DB.prepare(`
			CREATE TABLE IF NOT EXISTS rate_limits (
				ip TEXT NOT NULL,
				endpoint TEXT NOT NULL,
				window_start INTEGER NOT NULL,
				count INTEGER DEFAULT 1,
				PRIMARY KEY (ip, endpoint, window_start)
			)
		`).run();
	});

	beforeEach(async () => {
		// Clear data before each test
		await env.DB.prepare('DELETE FROM challenges').run();
		await env.DB.prepare('DELETE FROM rate_limits').run();
	});

	describe('Concurrent Verification Prevention', () => {
		it('concurrent verification requests only yield one successful token', async () => {
			// Generate a constraint_text challenge with a known answer format
			const nonce = 'a1b2c3d4e5f6789012345678901234ab';
			const challengeData = generateConstraintTextChallenge(nonce);
			const challengeId = crypto.randomUUID();
			const now = Date.now();

			// Insert challenge directly with known expected answer
			await env.DB.prepare(
				`INSERT INTO challenges (id, type, prompt, expected_answer, nonce, parameters, created_at, expires_at, solved)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
			)
				.bind(
					challengeId,
					'constraint_text',
					challengeData.prompt,
					challengeData.expectedAnswer, // This is the phrase
					nonce,
					JSON.stringify(challengeData.parameters),
					now,
					now + 60000 // 1 minute expiry
				)
				.run();

			// Generate a valid solution - words where first letters spell out the phrase
			const solution = generateValidSolution(challengeData.expectedAnswer);

			// Fire many concurrent verification requests
			const concurrentRequests = 10;
			const verifyPromises = Array(concurrentRequests)
				.fill(null)
				.map(() =>
					SELF.fetch('https://example.com/verify', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							challengeId,
							solution,
						}),
					})
				);

			const responses = await Promise.all(verifyPromises);
			const results = await Promise.all(responses.map((r) => r.json() as Promise<{ success: boolean; token?: string }>));

			// Count successful verifications
			const successCount = results.filter((r) => r.success === true).length;
			const tokensIssued = results.filter((r) => r.token).map((r) => r.token);

			// Only ONE should succeed - race condition prevention
			expect(successCount).toBe(1);
			expect(tokensIssued.length).toBe(1);
		});

		it('already-solved challenges cannot be re-verified', async () => {
			// Generate a constraint_text challenge with a known answer format
			const nonce = 'b2c3d4e5f6789012345678901234abcd';
			const challengeData = generateConstraintTextChallenge(nonce);
			const challengeId = crypto.randomUUID();
			const now = Date.now();

			// Insert challenge directly
			await env.DB.prepare(
				`INSERT INTO challenges (id, type, prompt, expected_answer, nonce, parameters, created_at, expires_at, solved)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
			)
				.bind(
					challengeId,
					'constraint_text',
					challengeData.prompt,
					challengeData.expectedAnswer,
					nonce,
					JSON.stringify(challengeData.parameters),
					now,
					now + 60000
				)
				.run();

			// Generate a valid solution
			const solution = generateValidSolution(challengeData.expectedAnswer);

			// First verification - should succeed
			const firstVerify = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId,
					solution,
				}),
			});
			const firstResult = (await firstVerify.json()) as { success: boolean };
			expect(firstResult.success).toBe(true);

			// Second verification - should fail
			const secondVerify = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId,
					solution,
				}),
			});
			expect(secondVerify.status).toBe(400);
			const secondResult = (await secondVerify.json()) as { success: boolean; error: string };
			expect(secondResult.success).toBe(false);
			expect(secondResult.error).toContain('already solved');
		});

		it('atomic update prevents TOCTOU vulnerability', async () => {
			// Generate a constraint_text challenge with a known answer format
			const nonce = 'c3d4e5f6789012345678901234abcdef';
			const challengeData = generateConstraintTextChallenge(nonce);
			const challengeId = crypto.randomUUID();
			const now = Date.now();

			// Insert challenge directly
			await env.DB.prepare(
				`INSERT INTO challenges (id, type, prompt, expected_answer, nonce, parameters, created_at, expires_at, solved)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
			)
				.bind(
					challengeId,
					'constraint_text',
					challengeData.prompt,
					challengeData.expectedAnswer,
					nonce,
					JSON.stringify(challengeData.parameters),
					now,
					now + 60000
				)
				.run();

			// Generate a valid solution
			const solution = generateValidSolution(challengeData.expectedAnswer);

			// Run many parallel verifications rapidly
			const attempts = 20;
			const verifyPromises = Array(attempts)
				.fill(null)
				.map(() =>
					SELF.fetch('https://example.com/verify', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							challengeId,
							solution,
						}),
					})
				);

			const responses = await Promise.all(verifyPromises);
			const results = await Promise.all(responses.map((r) => r.json() as Promise<{ success: boolean; token?: string }>));

			// Verify exactly one token was issued
			const tokens = results.filter((r) => r.token).map((r) => r.token);
			expect(tokens.length).toBe(1);

			// Verify all tokens are the same (if somehow multiple were issued)
			const uniqueTokens = new Set(tokens);
			expect(uniqueTokens.size).toBe(1);
		});
	});

	describe('Database Atomicity', () => {
		it('markSolved uses atomic UPDATE with WHERE clause', async () => {
			// Create a challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const challenge = (await challengeResponse.json()) as { challengeId: string };

			// Manually mark as solved via DB
			await env.DB.prepare('UPDATE challenges SET solved = 1 WHERE id = ?').bind(challenge.challengeId).run();

			// Try to verify - should fail because already solved
			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: 'any',
				}),
			});

			expect(verifyResponse.status).toBe(400);
			const result = (await verifyResponse.json()) as { error: string };
			expect(result.error).toContain('already solved');
		});
	});
});
