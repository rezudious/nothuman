import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';
import { challengeRoutes } from './routes/challenge';
import { verifyRoutes } from './routes/verify';
import { tokenRoutes } from './routes/token';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { errorHandlerMiddleware, notFoundHandler } from './middleware/error-handler';

// Types
type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

type Variables = {
	// Add request-scoped variables here
};

export type AppEnv = {
	Bindings: Bindings;
	Variables: Variables;
};

// Response types
interface HealthResponse {
	status: 'ok' | 'error';
	timestamp: string;
	database: 'connected' | 'error';
	error?: string;
}

// App
const app = new Hono<AppEnv>();

// Global middleware (order matters)
app.use('*', errorHandlerMiddleware);
app.use('*', corsMiddleware);
app.use('*', rateLimitMiddleware);

// Root endpoint - API info
app.get('/', (c) => {
	return c.json({
		name: 'NotHuman API',
		version: '1.0.0',
		description: 'Reverse-CAPTCHA API for AI agent verification',
		endpoints: ['/health', '/challenge', '/verify', '/token/validate'],
		docs: 'https://github.com/rezudious/nothuman',
	});
});

// Health check
app.get('/health', async (c) => {
	let dbStatus: 'connected' | 'error' = 'error';
	let error: string | undefined;

	try {
		await c.env.DB.prepare('SELECT COUNT(*) FROM challenges').first();
		dbStatus = 'connected';
	} catch (e) {
		error = e instanceof Error ? e.message : 'Unknown database error';
	}

	const response: HealthResponse = {
		status: dbStatus === 'connected' ? 'ok' : 'error',
		timestamp: new Date().toISOString(),
		database: dbStatus,
		...(error && { error }),
	};

	return c.json(response, dbStatus === 'connected' ? 200 : 503);
});

// Mount routes
app.route('/challenge', challengeRoutes);
app.route('/verify', verifyRoutes);
app.route('/token', tokenRoutes);

// 404 handler for unknown routes
app.notFound(notFoundHandler);

export default app;
