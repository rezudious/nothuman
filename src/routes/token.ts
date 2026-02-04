import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { validateVerificationToken } from '../auth/token';

const tokenRoutes = new Hono<AppEnv>();

interface ValidateRequest {
	token: string;
}

tokenRoutes.post('/validate', async (c) => {
	// Parse request body
	let body: ValidateRequest;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ valid: false, error: 'Invalid JSON body' }, 400);
	}

	const { token } = body;

	if (!token || typeof token !== 'string') {
		return c.json({ valid: false, error: 'Missing token' }, 400);
	}

	const result = await validateVerificationToken(token, c.env.JWT_SECRET);

	if (result.valid) {
		return c.json(result, 200);
	} else {
		return c.json(result, 400);
	}
});

export { tokenRoutes };
