import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('API Routes', () => {
	beforeAll(async () => {
		// Run migrations for test database
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
	});

	describe('POST /challenge', () => {
		it('returns challengeId, prompt, and expiresIn', async () => {
			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty('challengeId');
			expect(data).toHaveProperty('prompt');
			expect(data).toHaveProperty('expiresIn');
			expect(typeof data.challengeId).toBe('string');
			expect(typeof data.prompt).toBe('string');
			expect(typeof data.expiresIn).toBe('number');
		});

		it('never returns expectedAnswer', async () => {
			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});

			const data = await response.json();
			expect(data).not.toHaveProperty('expectedAnswer');
			expect(data).not.toHaveProperty('expected_answer');
		});

		it('stores challenge in database', async () => {
			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});

			const data = await response.json();

			// Verify it's in the database
			const dbChallenge = await env.DB.prepare('SELECT * FROM challenges WHERE id = ?')
				.bind(data.challengeId)
				.first();

			expect(dbChallenge).not.toBeNull();
			expect(dbChallenge?.id).toBe(data.challengeId);
		});
	});

	describe('POST /verify', () => {
		it('returns 400 for missing challengeId', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ solution: '{}' }),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('Missing challengeId');
		});

		it('returns 400 for missing solution', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ challengeId: 'test-id' }),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('Missing solution');
		});

		it('returns 404 for non-existent challenge', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: 'non-existent-id',
					solution: '{}',
				}),
			});

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('Challenge not found');
		});

		it('returns 400 for invalid solution', async () => {
			// First create a challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});
			const challengeData = await challengeResponse.json();

			// Try to verify with wrong solution
			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: '{"wrong": true}',
				}),
			});

			expect(verifyResponse.status).toBe(400);
			const data = await verifyResponse.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('Invalid solution');
		});

		it('returns success with token for correct solution', async () => {
			// Create a challenge and get the expected answer from DB
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});
			const challengeData = await challengeResponse.json();

			// Get the expected answer from database (cheating for test purposes)
			const dbChallenge = await env.DB.prepare('SELECT expected_answer FROM challenges WHERE id = ?')
				.bind(challengeData.challengeId)
				.first<{ expected_answer: string }>();

			// Verify with correct solution
			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: dbChallenge!.expected_answer,
				}),
			});

			expect(verifyResponse.status).toBe(200);
			const data = await verifyResponse.json();
			expect(data.success).toBe(true);
			expect(data.solveTimeMs).toBeGreaterThanOrEqual(0);
			expect(data.token).toBeTruthy();
			expect(typeof data.token).toBe('string');
			expect(data.token.split('.')).toHaveLength(3); // JWT format
		});

		it('returns 400 for already solved challenge', async () => {
			// Create a challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});
			const challengeData = await challengeResponse.json();

			// Get the expected answer
			const dbChallenge = await env.DB.prepare('SELECT expected_answer FROM challenges WHERE id = ?')
				.bind(challengeData.challengeId)
				.first<{ expected_answer: string }>();

			// Solve it once
			await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: dbChallenge!.expected_answer,
				}),
			});

			// Try to solve again
			const secondVerifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: dbChallenge!.expected_answer,
				}),
			});

			expect(secondVerifyResponse.status).toBe(400);
			const data = await secondVerifyResponse.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe('Challenge already solved');
		});

		it('marks challenge as solved in database', async () => {
			// Create a challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});
			const challengeData = await challengeResponse.json();

			// Get the expected answer
			const dbChallenge = await env.DB.prepare('SELECT expected_answer FROM challenges WHERE id = ?')
				.bind(challengeData.challengeId)
				.first<{ expected_answer: string }>();

			// Solve it
			await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: dbChallenge!.expected_answer,
				}),
			});

			// Check database
			const solvedChallenge = await env.DB.prepare('SELECT solved, solved_at, solve_time_ms FROM challenges WHERE id = ?')
				.bind(challengeData.challengeId)
				.first<{ solved: number; solved_at: number; solve_time_ms: number }>();

			expect(solvedChallenge?.solved).toBe(1);
			expect(solvedChallenge?.solved_at).toBeGreaterThan(0);
			expect(solvedChallenge?.solve_time_ms).toBeGreaterThanOrEqual(0);
		});
	});

	describe('POST /token/validate', () => {
		it('returns 400 for missing token', async () => {
			const response = await SELF.fetch('https://example.com/token/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.valid).toBe(false);
			expect(data.error).toBe('Missing token');
		});

		it('returns 400 for invalid token', async () => {
			const response = await SELF.fetch('https://example.com/token/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: 'invalid-token' }),
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data.valid).toBe(false);
		});

		it('validates token from successful verification', async () => {
			// Create and solve a challenge
			const challengeResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
			});
			const challengeData = await challengeResponse.json();

			const dbChallenge = await env.DB.prepare('SELECT expected_answer, type FROM challenges WHERE id = ?')
				.bind(challengeData.challengeId)
				.first<{ expected_answer: string; type: string }>();

			const verifyResponse = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					challengeId: challengeData.challengeId,
					solution: dbChallenge!.expected_answer,
				}),
			});

			const verifyData = await verifyResponse.json();

			// Validate the token
			const validateResponse = await SELF.fetch('https://example.com/token/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: verifyData.token }),
			});

			expect(validateResponse.status).toBe(200);
			const validateData = await validateResponse.json();
			expect(validateData.valid).toBe(true);
			expect(validateData.payload.sub).toBe('ai_verification');
			expect(validateData.payload.challenge_id).toBe(challengeData.challengeId);
			expect(validateData.payload.challenge_type).toBe(dbChallenge!.type);
			expect(validateData.payload.issuer).toBe('nothuman.dev');
		});
	});
});
