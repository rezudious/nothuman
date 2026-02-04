import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { validateVerificationToken } from '../auth/token';
import { logger } from '../utils/logger';

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
		logger.info('token_validated', {
			valid: true,
			challengeId: result.payload?.challenge_id,
		});
		return c.json(result, 200);
	} else {
		logger.warn('token_validated', { valid: false, error: result.error });
		return c.json(result, 400);
	}
});

export { tokenRoutes };
