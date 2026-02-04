import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('NotHuman API', () => {
	describe('GET /health', () => {
		it('returns status ok with timestamp', async () => {
			const response = await SELF.fetch('https://example.com/health');
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.status).toBe('ok');
			expect(data.timestamp).toBeDefined();
			expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
		});
	});
});
