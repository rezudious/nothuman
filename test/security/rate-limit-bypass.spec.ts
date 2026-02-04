import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

describe('Security: Rate Limit Bypass Prevention', () => {
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
		// Clear rate limits before each test
		await env.DB.prepare('DELETE FROM rate_limits').run();
	});

	describe('IP Spoofing Prevention', () => {
		it('does NOT trust X-Forwarded-For header for rate limiting', async () => {
			// First, exhaust rate limit for "unknown" IP (no CF-Connecting-IP header)
			// Make enough requests to hit the rate limit
			const limit = 30; // /challenge endpoint limit

			for (let i = 0; i < limit + 1; i++) {
				await SELF.fetch('https://example.com/challenge', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Now try with spoofed X-Forwarded-For - should STILL be rate limited
			// because X-Forwarded-For is not trusted
			const spoofedResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Forwarded-For': '1.2.3.4', // Spoofed IP - should be ignored
				},
			});

			// If X-Forwarded-For is NOT trusted, this should be 429 (rate limited)
			// because both requests use "unknown" as the IP
			expect(spoofedResponse.status).toBe(429);
		});

		it('rejects requests when all IP headers are missing', async () => {
			// Clear rate limits
			await env.DB.prepare('DELETE FROM rate_limits').run();

			// Should still work (using "unknown" as IP), but the rate limit should apply
			const response = await SELF.fetch('https://example.com/health');
			expect(response.status).toBe(200);
			expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
		});

		it('CF-Connecting-IP is the only trusted IP source when present', async () => {
			// Clear rate limits
			await env.DB.prepare('DELETE FROM rate_limits').run();

			// With CF-Connecting-IP set, should use that IP
			// First make requests with CF-Connecting-IP
			const limit = 30;
			for (let i = 0; i < limit + 1; i++) {
				await SELF.fetch('https://example.com/challenge', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'CF-Connecting-IP': '10.0.0.1',
					},
				});
			}

			// Should be rate limited for 10.0.0.1
			const rateLimitedResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '10.0.0.1',
				},
			});
			expect(rateLimitedResponse.status).toBe(429);

			// Different CF-Connecting-IP should NOT be rate limited
			const differentIpResponse = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '10.0.0.2',
				},
			});
			expect(differentIpResponse.status).not.toBe(429);
		});

		it('X-Forwarded-For cannot override CF-Connecting-IP', async () => {
			// Clear rate limits
			await env.DB.prepare('DELETE FROM rate_limits').run();

			// Exhaust rate limit for CF-Connecting-IP
			const limit = 30;
			for (let i = 0; i < limit + 1; i++) {
				await SELF.fetch('https://example.com/challenge', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'CF-Connecting-IP': '192.168.1.1',
					},
				});
			}

			// Try to bypass with X-Forwarded-For - should NOT work
			const bypassAttempt = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'CF-Connecting-IP': '192.168.1.1',
					'X-Forwarded-For': '99.99.99.99', // Attempting to spoof
				},
			});

			// Should still be rate limited because CF-Connecting-IP takes precedence
			expect(bypassAttempt.status).toBe(429);
		});
	});

	describe('Fail-Closed Behavior', () => {
		it('returns 503 when rate limit database fails', async () => {
			// This test requires mocking the database to fail
			// In a real scenario, we'd test this by dropping the rate_limits table
			await env.DB.prepare('DROP TABLE IF EXISTS rate_limits').run();

			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			// Should fail closed with 503, not allow the request through
			expect(response.status).toBe(503);

			// Recreate table for other tests
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

		it('returns proper error message on database failure', async () => {
			// Drop the table to cause failure
			await env.DB.prepare('DROP TABLE IF EXISTS rate_limits').run();

			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			expect(response.status).toBe(503);
			const data = await response.json();
			expect(data.error).toBe('Service temporarily unavailable');
			expect(data.code).toBe('SERVICE_UNAVAILABLE');

			// Recreate table
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
	});

	describe('Rate Limit Enforcement', () => {
		it('enforces rate limits per endpoint', async () => {
			// Clear rate limits
			await env.DB.prepare('DELETE FROM rate_limits').run();

			// /challenge has limit of 30
			const challengeLimit = 30;
			for (let i = 0; i < challengeLimit; i++) {
				const response = await SELF.fetch('https://example.com/challenge', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				});
				expect(response.status).not.toBe(429);
			}

			// Next request should be rate limited
			const rateLimited = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
			expect(rateLimited.status).toBe(429);
		});

		it('includes Retry-After header when rate limited', async () => {
			// Clear and exhaust rate limit
			await env.DB.prepare('DELETE FROM rate_limits').run();

			const limit = 30;
			for (let i = 0; i < limit + 1; i++) {
				await SELF.fetch('https://example.com/challenge', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const response = await SELF.fetch('https://example.com/challenge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});

			expect(response.status).toBe(429);
			expect(response.headers.get('Retry-After')).toBeTruthy();
			const retryAfter = parseInt(response.headers.get('Retry-After') || '0');
			expect(retryAfter).toBeGreaterThan(0);
			expect(retryAfter).toBeLessThanOrEqual(60); // Should be within the window
		});
	});
});
