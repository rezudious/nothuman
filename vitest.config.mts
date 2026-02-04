import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					bindings: {
						JWT_SECRET: 'test-secret-for-jwt-signing-min-32-chars',
					},
				},
			},
		},
	},
});
