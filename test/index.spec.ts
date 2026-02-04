import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('NotHuman API', () => {
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

	describe('GET /health', () => {
		it('returns status ok with database connected', async () => {
			const response = await SELF.fetch('https://example.com/health');
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe('ok');
			expect(data.database).toBe('connected');
			expect(data.timestamp).toBeDefined();
			expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
		});
	});
});
