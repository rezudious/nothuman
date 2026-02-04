import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

// Types
type Bindings = {
	DB: D1Database;
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

// Routes
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

export default app;
