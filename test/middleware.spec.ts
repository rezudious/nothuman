import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Middleware', () => {
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

	describe('CORS', () => {
		it('includes CORS headers in response', async () => {
			const response = await SELF.fetch('https://example.com/health');

			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
			expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
		});

		it('handles OPTIONS preflight request', async () => {
			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'OPTIONS',
			});

			expect(response.status).toBe(204);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});
	});

	describe('Rate Limiting', () => {
		it('includes rate limit headers', async () => {
			const response = await SELF.fetch('https://example.com/health');

			expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
			expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
			expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
		});

		it('decrements remaining count', async () => {
			// Clear rate limits for this test
			await env.DB.prepare('DELETE FROM rate_limits').run();

			const response1 = await SELF.fetch('https://example.com/health');
			const remaining1 = parseInt(response1.headers.get('X-RateLimit-Remaining') || '0');

			const response2 = await SELF.fetch('https://example.com/health');
			const remaining2 = parseInt(response2.headers.get('X-RateLimit-Remaining') || '0');

			expect(remaining2).toBeLessThan(remaining1);
		});
	});

	describe('Error Handler', () => {
		it('returns 404 for unknown routes', async () => {
			const response = await SELF.fetch('https://example.com/unknown-route');

			expect(response.status).toBe(404);
			const data = await response.json();
			expect(data.error).toBe('Endpoint not found');
			expect(data.code).toBe('NOT_FOUND');
		});

		it('returns consistent error format', async () => {
			const response = await SELF.fetch('https://example.com/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: 'not valid json',
			});

			expect(response.status).toBe(400);
			const data = await response.json();
			expect(data).toHaveProperty('error');
			expect(data).toHaveProperty('success');
		});
	});
});
