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
	status: 'ok';
	timestamp: string;
}

// App
const app = new Hono<AppEnv>();

// Routes
app.get('/health', (c) => {
	const response: HealthResponse = {
		status: 'ok',
		timestamp: new Date().toISOString(),
	};
	return c.json(response);
});

export default app;
