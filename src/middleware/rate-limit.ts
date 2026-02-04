import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';

// Rate limits per minute by endpoint
const RATE_LIMITS: Record<string, number> = {
	'/challenge': 30,
	'/verify': 60,
	'/token/validate': 100,
};

// Default limit for unlisted endpoints
const DEFAULT_LIMIT = 100;

// Window size in milliseconds (1 minute)
const WINDOW_MS = 60 * 1000;

// Cleanup probability (1 in N requests triggers cleanup)
const CLEANUP_PROBABILITY = 100;

function getWindowStart(): number {
	const now = Date.now();
	return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function getClientIP(c: Context<AppEnv>): string {
	// Cloudflare provides the real IP in CF-Connecting-IP header
	return c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}

function getEndpointKey(path: string): string {
	// Normalize path to match rate limit keys
	if (path.startsWith('/challenge')) return '/challenge';
	if (path.startsWith('/verify')) return '/verify';
	if (path.startsWith('/token/validate')) return '/token/validate';
	return path;
}

async function cleanupOldEntries(db: D1Database): Promise<void> {
	// Only run cleanup occasionally
	if (Math.random() * CLEANUP_PROBABILITY > 1) return;

	const cutoff = Date.now() - WINDOW_MS * 5; // Keep last 5 minutes
	await db.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(cutoff).run();
}

export async function rateLimitMiddleware(c: Context<AppEnv>, next: Next) {
	const db = c.env.DB;
	const ip = getClientIP(c);
	const endpoint = getEndpointKey(c.req.path);
	const windowStart = getWindowStart();
	const limit = RATE_LIMITS[endpoint] ?? DEFAULT_LIMIT;

	try {
		// Try to increment or insert
		const existing = await db
			.prepare('SELECT count FROM rate_limits WHERE ip = ? AND endpoint = ? AND window_start = ?')
			.bind(ip, endpoint, windowStart)
			.first<{ count: number }>();

		let currentCount: number;

		if (existing) {
			currentCount = existing.count + 1;
			await db
				.prepare('UPDATE rate_limits SET count = ? WHERE ip = ? AND endpoint = ? AND window_start = ?')
				.bind(currentCount, ip, endpoint, windowStart)
				.run();
		} else {
			currentCount = 1;
			await db
				.prepare('INSERT INTO rate_limits (ip, endpoint, window_start, count) VALUES (?, ?, ?, ?)')
				.bind(ip, endpoint, windowStart, 1)
				.run();
		}

		// Check if over limit
		if (currentCount > limit) {
			const retryAfter = Math.ceil((windowStart + WINDOW_MS - Date.now()) / 1000);
			return c.json(
				{
					error: 'Rate limit exceeded',
					code: 'RATE_LIMIT_EXCEEDED',
				},
				429,
				{
					'Retry-After': String(retryAfter),
					'X-RateLimit-Limit': String(limit),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': String(Math.ceil((windowStart + WINDOW_MS) / 1000)),
				}
			);
		}

		// Add rate limit headers to response
		c.header('X-RateLimit-Limit', String(limit));
		c.header('X-RateLimit-Remaining', String(Math.max(0, limit - currentCount)));
		c.header('X-RateLimit-Reset', String(Math.ceil((windowStart + WINDOW_MS) / 1000)));

		// Cleanup old entries occasionally
		cleanupOldEntries(db).catch(() => {
			// Ignore cleanup errors
		});

		await next();
	} catch (error) {
		// If rate limiting fails, allow the request (fail open)
		console.error('Rate limit error:', error);
		await next();
	}
}
