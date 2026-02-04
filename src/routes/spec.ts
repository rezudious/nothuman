import { Hono } from 'hono';
import type { AppEnv } from '../types';

const spec = new Hono<AppEnv>();

const API_SPEC = {
	name: 'Humanproof',
	version: '1.0.0',
	description: 'Reverse CAPTCHA API that verifies AI agents',
	base_url: 'https://api.humanproof.dev',
	endpoints: {
		challenge: {
			method: 'POST',
			path: '/challenge',
			description: 'Request a new verification challenge',
			request_body: null,
			response: {
				challengeId: 'string (UUID)',
				prompt: 'string (the challenge to solve)',
				expiresIn: 'number (milliseconds until expiration)',
			},
		},
		verify: {
			method: 'POST',
			path: '/verify',
			description: 'Submit a solution to verify',
			request_body: {
				challengeId: 'string (UUID from /challenge)',
				solution: 'string (JSON solution to the challenge)',
			},
			response: {
				success: 'boolean',
				solveTimeMs: 'number (only if success)',
				token: 'string (JWT, only if success)',
				error: 'string (only if failure)',
			},
		},
		validate: {
			method: 'POST',
			path: '/token/validate',
			description: 'Validate a verification token',
			request_body: {
				token: 'string (JWT from /verify)',
			},
			response: {
				valid: 'boolean',
				payload: 'object (decoded token, only if valid)',
				error: 'string (only if invalid)',
			},
		},
	},
	challenge_types: ['structured_json', 'computational_array', 'pattern_completion', 'constraint_text'],
	time_limit_ms: 3000,
};

spec.get('/', (c) => {
	return c.json(API_SPEC);
});

export default spec;
