import { SELF, env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

describe('API Meta Endpoints', () => {
	beforeAll(async () => {
		// Set up database tables for badge health check
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

	describe('GET /spec', () => {
		it('returns JSON API specification', async () => {
			const response = await SELF.fetch('https://example.com/spec');
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toContain('application/json');

			const spec = await response.json();
			expect(spec.name).toBe('Humanproof');
			expect(spec.version).toBe('1.0.0');
			expect(spec.base_url).toBe('https://api.humanproof.dev');
		});

		it('includes all endpoint definitions', async () => {
			const response = await SELF.fetch('https://example.com/spec');
			const spec = await response.json();

			expect(spec.endpoints).toHaveProperty('challenge');
			expect(spec.endpoints).toHaveProperty('verify');
			expect(spec.endpoints).toHaveProperty('validate');

			expect(spec.endpoints.challenge.method).toBe('POST');
			expect(spec.endpoints.challenge.path).toBe('/challenge');
			expect(spec.endpoints.verify.method).toBe('POST');
			expect(spec.endpoints.verify.path).toBe('/verify');
			expect(spec.endpoints.validate.method).toBe('POST');
			expect(spec.endpoints.validate.path).toBe('/token/validate');
		});

		it('includes challenge types and time limit', async () => {
			const response = await SELF.fetch('https://example.com/spec');
			const spec = await response.json();

			expect(spec.challenge_types).toEqual([
				'structured_json',
				'computational_array',
				'pattern_completion',
				'constraint_text',
			]);
			expect(spec.time_limit_ms).toBe(3000);
		});
	});

	describe('GET /llms.txt', () => {
		it('returns plain text content', async () => {
			const response = await SELF.fetch('https://example.com/llms.txt');
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toContain('text/plain');
		});

		it('contains API documentation', async () => {
			const response = await SELF.fetch('https://example.com/llms.txt');
			const text = await response.text();

			expect(text).toContain('# Humanproof API');
			expect(text).toContain('Reverse CAPTCHA');
			expect(text).toContain('https://api.humanproof.dev');
			expect(text).toContain('POST /challenge');
			expect(text).toContain('POST /verify');
			expect(text).toContain('3 seconds');
		});

		it('lists all challenge types', async () => {
			const response = await SELF.fetch('https://example.com/llms.txt');
			const text = await response.text();

			expect(text).toContain('structured_json');
			expect(text).toContain('computational_array');
			expect(text).toContain('pattern_completion');
			expect(text).toContain('constraint_text');
		});
	});

	describe('GET /badge', () => {
		it('returns SVG image', async () => {
			const response = await SELF.fetch('https://example.com/badge');
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
		});

		it('returns operational badge when healthy', async () => {
			const response = await SELF.fetch('https://example.com/badge');
			const svg = await response.text();

			expect(svg).toContain('<svg');
			expect(svg).toContain('Humanproof');
			expect(svg).toContain('operational');
			expect(svg).toContain('#22c55e'); // Green color
		});

		it('has no-cache headers', async () => {
			const response = await SELF.fetch('https://example.com/badge');

			expect(response.headers.get('Cache-Control')).toContain('no-cache');
		});

		it('is embeddable in markdown', async () => {
			const response = await SELF.fetch('https://example.com/badge');
			const svg = await response.text();

			// SVG should have proper XML namespace
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
			// Should have accessible title
			expect(svg).toContain('<title>');
		});
	});
});
