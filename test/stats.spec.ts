import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

describe('Stats Endpoint', () => {
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

		// Rate limits table needed for middleware to pass requests through
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
		// Clear challenges table before each test
		await env.DB.prepare('DELETE FROM challenges').run();
	});

	describe('GET /stats', () => {
		it('returns stats structure with empty data', async () => {
			const response = await SELF.fetch('https://example.com/stats', {
				method: 'GET',
			});

			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty('period', '24h');
			expect(data).toHaveProperty('totalChallenges', 0);
			expect(data).toHaveProperty('solvedChallenges', 0);
			expect(data).toHaveProperty('successRate', 0);
			expect(data).toHaveProperty('avgSolveTimeMs', null);
			expect(data).toHaveProperty('byType');
			expect(data).toHaveProperty('generatedAt');
			expect(Array.isArray(data.byType)).toBe(true);
		});

		it('counts total challenges in last 24h', async () => {
			const now = Date.now();

			// Insert 3 challenges within 24h
			for (let i = 0; i < 3; i++) {
				await env.DB.prepare(`
					INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved)
					VALUES (?, 'structured_json', 'test', 'answer', 'abc123', ?, ?, 0)
				`)
					.bind(`id-${i}`, now - i * 1000, now + 3000)
					.run();
			}

			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.totalChallenges).toBe(3);
		});

		it('excludes challenges older than 24h', async () => {
			const now = Date.now();
			const twoDaysAgo = now - 48 * 60 * 60 * 1000;

			// Insert 1 recent, 1 old
			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved)
				VALUES ('recent', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 0)
			`)
				.bind(now, now + 3000)
				.run();

			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved)
				VALUES ('old', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 0)
			`)
				.bind(twoDaysAgo, twoDaysAgo + 3000)
				.run();

			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.totalChallenges).toBe(1);
		});

		it('calculates success rate correctly', async () => {
			const now = Date.now();

			// Insert 4 challenges, 2 solved
			for (let i = 0; i < 4; i++) {
				await env.DB.prepare(`
					INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
					VALUES (?, 'structured_json', 'test', 'answer', 'abc123', ?, ?, ?, ?)
				`)
					.bind(`id-${i}`, now - i * 1000, now + 3000, i < 2 ? 1 : 0, i < 2 ? 100 : null)
					.run();
			}

			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.totalChallenges).toBe(4);
			expect(data.solvedChallenges).toBe(2);
			expect(data.successRate).toBe(50);
		});

		it('calculates average solve time correctly', async () => {
			const now = Date.now();

			// Insert 2 solved challenges with solve times 100ms and 200ms
			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
				VALUES ('id-1', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 1, 100)
			`)
				.bind(now, now + 3000)
				.run();

			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
				VALUES ('id-2', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 1, 200)
			`)
				.bind(now, now + 3000)
				.run();

			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.avgSolveTimeMs).toBe(150);
		});

		it('returns breakdown by challenge type', async () => {
			const now = Date.now();

			// Insert challenges of different types
			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
				VALUES ('json-1', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 1, 100)
			`)
				.bind(now, now + 3000)
				.run();

			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
				VALUES ('json-2', 'structured_json', 'test', 'answer', 'abc123', ?, ?, 0, null)
			`)
				.bind(now, now + 3000)
				.run();

			await env.DB.prepare(`
				INSERT INTO challenges (id, type, prompt, expected_answer, nonce, created_at, expires_at, solved, solve_time_ms)
				VALUES ('array-1', 'computational_array', 'test', 'answer', 'abc123', ?, ?, 1, 200)
			`)
				.bind(now, now + 3000)
				.run();

			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.byType).toHaveLength(2);

			const jsonStats = data.byType.find((t: any) => t.type === 'structured_json');
			expect(jsonStats).toBeDefined();
			expect(jsonStats.total).toBe(2);
			expect(jsonStats.solved).toBe(1);
			expect(jsonStats.successRate).toBe(50);
			expect(jsonStats.avgSolveTimeMs).toBe(100);

			const arrayStats = data.byType.find((t: any) => t.type === 'computational_array');
			expect(arrayStats).toBeDefined();
			expect(arrayStats.total).toBe(1);
			expect(arrayStats.solved).toBe(1);
			expect(arrayStats.successRate).toBe(100);
			expect(arrayStats.avgSolveTimeMs).toBe(200);
		});

		it('returns valid ISO timestamp in generatedAt', async () => {
			const response = await SELF.fetch('https://example.com/stats');
			const data = await response.json();

			expect(data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(() => new Date(data.generatedAt)).not.toThrow();
		});
	});
});
