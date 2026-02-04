import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { ChallengeDB } from '../db';
import { validateStructuredJson } from '../challenges/types/structured-json';
import { validateComputationalArray } from '../challenges/types/computational-array';

const verifyRoutes = new Hono<AppEnv>();

interface VerifyRequest {
	challengeId: string;
	solution: string;
}

interface VerifySuccessResponse {
	success: true;
	solveTimeMs: number;
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
		return c.json({ success: false, error: 'Invalid JSON body' } satisfies VerifyResponse, 400);
	}

	const { challengeId, solution } = body;

	if (!challengeId || typeof challengeId !== 'string') {
		return c.json({ success: false, error: 'Missing challengeId' } satisfies VerifyResponse, 400);
	}

	if (!solution || typeof solution !== 'string') {
		return c.json({ success: false, error: 'Missing solution' } satisfies VerifyResponse, 400);
	}

	// Look up challenge
	const challenge = await db.getById(challengeId);

	if (!challenge) {
		return c.json({ success: false, error: 'Challenge not found' } satisfies VerifyResponse, 404);
	}

	// Check if expired
	const now = Date.now();
	if (now > challenge.expires_at) {
		return c.json({ success: false, error: 'Challenge expired' } satisfies VerifyResponse, 400);
	}

	// Check if already solved
	if (challenge.solved === 1) {
		return c.json({ success: false, error: 'Challenge already solved' } satisfies VerifyResponse, 400);
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
		default:
			return c.json({ success: false, error: 'Unknown challenge type' } satisfies VerifyResponse, 500);
	}

	if (!isValid) {
		return c.json({ success: false, error: 'Invalid solution' } satisfies VerifyResponse, 400);
	}

	// Calculate solve time
	const solveTimeMs = now - challenge.created_at;

	// Mark as solved in D1
	await db.markSolved(challengeId, solveTimeMs);

	// Return success response
	const response: VerifySuccessResponse = {
		success: true,
		solveTimeMs,
	};

	return c.json(response, 200);
});

export { verifyRoutes };
