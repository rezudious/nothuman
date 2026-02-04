import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

describe('Security: Input Validation (DoS Prevention)', () => {
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

	describe('Solution Length Validation', () => {
		it('rejects oversized solutions (>1MB)', async () => {
			// First create a valid challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const challenge = (await challengeResponse.json()) as { challengeId: string };

			// Try to verify with an oversized solution (2MB of data)
			const oversizedSolution = 'x'.repeat(2 * 1024 * 1024);

			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: oversizedSolution,
				}),
			});

			// Should reject with 413 (Payload Too Large) or 400 (Bad Request)
			expect([400, 413]).toContain(verifyResponse.status);
			const data = await verifyResponse.json();
			expect(data.success).toBe(false);
		});

		it('rejects empty solutions', async () => {
			// First create a valid challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const challenge = (await challengeResponse.json()) as { challengeId: string };

			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: '',
				}),
			});

			expect(verifyResponse.status).toBe(400);
			const data = await verifyResponse.json();
			expect(data.success).toBe(false);
			expect(data.error).toBeDefined();
		});

		it('rejects non-string solutions', async () => {
			// First create a valid challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			const challenge = (await challengeResponse.json()) as { challengeId: string };

			// Try with number
			const numberResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: 12345,
				}),
			});
			expect(numberResponse.status).toBe(400);

			// Try with array
			const arrayResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: ['a', 'b', 'c'],
				}),
			});
			expect(arrayResponse.status).toBe(400);

			// Try with object
			const objectResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: { foo: 'bar' },
				}),
			});
			expect(objectResponse.status).toBe(400);

			// Try with null
			const nullResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challenge.challengeId,
					solution: null,
				}),
			});
			expect(nullResponse.status).toBe(400);
		});
	});

	describe('ChallengeId Validation', () => {
		it('rejects missing challengeId', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					solution: 'some solution',
				}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toContain('challengeId');
		});

		it('rejects non-string challengeId', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: 12345,
					solution: 'some solution',
				}),
			});

			expect(response.status).toBe(400);
		});

		it('returns 404 for non-existent challengeId', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: 'non-existent-id-12345',
					solution: 'some solution',
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toContain('not found');
		});
	});

	describe('Request Body Size Limit', () => {
		it('rejects request bodies larger than 2MB', async () => {
			// Create a 3MB payload
			const largePayload = JSON.stringify({
				challengeId: 'test',
				solution: 'x'.repeat(3 * 1024 * 1024),
			});

			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: largePayload,
			});

			// Should be rejected before processing
			expect([400, 413]).toContain(response.status);
		});
	});

	describe('JSON Parsing Safety', () => {
		it('rejects deeply nested JSON (prototype pollution prevention)', async () => {
			// Create deeply nested object
			let nested = '{"a":';
			const depth = 1000;
			for (let i = 0; i < depth; i++) {
				nested += '{"b":';
			}
			nested += '"x"';
			for (let i = 0; i < depth; i++) {
				nested += '}';
			}
			nested += '}';

			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: nested,
			});

			// Should either reject with 400 or handle gracefully
			expect(response.status).toBeGreaterThanOrEqual(400);
		});

		it('handles malformed JSON gracefully', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not valid json at all {{{',
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toContain('JSON');
		});

		it('handles truncated JSON gracefully', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{"challengeId": "test", "solution": "incomplete',
			});

			expect(response.status).toBe(400);
		});
	});
});
