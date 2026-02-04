import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';
const MAX_AGE = '86400'; // 24 hours

export async function corsMiddleware(c: Context<AppEnv>, next: Next) {
	// Set CORS headers for all responses
	c.header('Access-Control-Allow-Origin', '*');
	c.header('Access-Control-Allow-Methods', ALLOWED_METHODS);
	c.header('Access-Control-Allow-Headers', ALLOWED_HEADERS);
	c.header('Access-Control-Max-Age', MAX_AGE);

	// Handle preflight requests
	if (c.req.method === 'OPTIONS') {
		return c.body(null, 204);
	}

	await next();
}
