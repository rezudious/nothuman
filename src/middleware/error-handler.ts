import type { Context, Next } from 'hono';
import type { AppEnv } from '../index';
import { logger } from '../utils/logger';

interface ErrorResponse {
	error: string;
	code: string;
}

export async function errorHandlerMiddleware(c: Context<AppEnv>, next: Next) {
	try {
		await next();
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		const errorStack = err instanceof Error ? err.stack : undefined;

		logger.error('unhandled_error', {
			error: errorMessage,
			path: c.req.path,
			method: c.req.method,
			stack: errorStack,
		});

		const response: ErrorResponse = {
			error: 'Internal server error',
			code: 'INTERNAL_ERROR',
		};

		// Don't expose stack traces or internal details
		if (err instanceof Error) {
			// Map known error types to user-friendly messages
			if (err.message.includes('JSON')) {
				response.error = 'Invalid JSON in request body';
				response.code = 'INVALID_JSON';
				return c.json(response, 400);
			}

			if (err.message.includes('not found')) {
				response.error = 'Resource not found';
				response.code = 'NOT_FOUND';
				return c.json(response, 404);
			}
		}

		return c.json(response, 500);
	}
}

// Handle 404 for unknown routes
export function notFoundHandler(c: Context<AppEnv>) {
	return c.json(
		{
			error: 'Endpoint not found',
			code: 'NOT_FOUND',
		},
		404
	);
}
