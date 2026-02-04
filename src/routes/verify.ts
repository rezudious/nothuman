import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { ChallengeDB } from '../db';
import { validateStructuredJson } from '../challenges/types/structured-json';
import { validateComputationalArray } from '../challenges/types/computational-array';
import { validatePatternCompletion } from '../challenges/types/pattern-completion';
import { validateConstraintText } from '../challenges/types/constraint-text';
import { generateVerificationToken } from '../auth/token';
import { logger } from '../utils/logger';

const verifyRoutes = new Hono<AppEnv>();

interface VerifyRequest {
	challengeId: string;
	solution: string;
}

interface VerifySuccessResponse {
	success: true;
	solveTimeMs: number;
	token: string;
}

interface VerifyFailureResponse {
	success: false;
	error: string;
}

type VerifyResponse = VerifySuccessResponse | VerifyFailureResponse;

verifyRoutes.post('/', async (c) => {
	const db = new ChallengeDB(c.env.DB);

	// Parse request body
	let body: VerifyRequest;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: 'Invalid JSON body' } satisfies VerifyFailureResponse, 400);
	}

	const { challengeId, solution } = body;

	if (!challengeId || typeof challengeId !== 'string') {
		return c.json({ success: false, error: 'Missing challengeId' } satisfies VerifyFailureResponse, 400);
	}

	if (!solution || typeof solution !== 'string') {
		return c.json({ success: false, error: 'Missing solution' } satisfies VerifyFailureResponse, 400);
	}

	// Look up challenge
	const challenge = await db.getById(challengeId);

	if (!challenge) {
		logger.warn('challenge_failed', { challengeId, reason: 'not_found' });
		return c.json({ success: false, error: 'Challenge not found' } satisfies VerifyFailureResponse, 404);
	}

	// Check if expired
	const now = Date.now();
	if (now > challenge.expires_at) {
		logger.warn('challenge_failed', { challengeId, reason: 'expired' });
		return c.json({ success: false, error: 'Challenge expired' } satisfies VerifyFailureResponse, 400);
	}

	// Check if already solved
	if (challenge.solved === 1) {
		logger.warn('challenge_failed', { challengeId, reason: 'already_solved' });
		return c.json({ success: false, error: 'Challenge already solved' } satisfies VerifyFailureResponse, 400);
	}

	// Route to correct validator by type
	let isValid = false;
	switch (challenge.type) {
		case 'structured_json':
			isValid = validateStructuredJson(solution, challenge.expected_answer);
			break;
		case 'computational_array':
			isValid = validateComputationalArray(solution, challenge.expected_answer);
			break;
		case 'pattern_completion':
			isValid = validatePatternCompletion(solution, challenge.expected_answer);
			break;
		case 'constraint_text':
			isValid = validateConstraintText(solution, challenge.expected_answer);
			break;
		default:
			return c.json({ success: false, error: 'Unknown challenge type' } satisfies VerifyFailureResponse, 500);
	}

	if (!isValid) {
		logger.warn('challenge_failed', { challengeId, reason: 'invalid_solution' });
		return c.json({ success: false, error: 'Invalid solution' } satisfies VerifyFailureResponse, 400);
	}

	// Calculate solve time
	const solveTimeMs = now - challenge.created_at;

	// Mark as solved in D1
	await db.markSolved(challengeId, solveTimeMs);

	// Generate JWT token
	const token = await generateVerificationToken(
		{
			challengeId,
			challengeType: challenge.type,
			solveTimeMs,
		},
		c.env.JWT_SECRET
	);

	logger.info('challenge_solved', {
		challengeId,
		type: challenge.type,
		solveTimeMs,
		success: true,
	});

	logger.info('token_generated', { challengeId });

	// Return success response with token
	const response: VerifySuccessResponse = {
		success: true,
		solveTimeMs,
		token,
	};

	return c.json(response, 200);
});

export { verifyRoutes };
