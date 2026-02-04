import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { generateChallenge } from '../challenges/generator';
import { ChallengeDB } from '../db';

const challengeRoutes = new Hono<AppEnv>();

interface ChallengeResponse {
	challengeId: string;
	prompt: string;
	expiresIn: number;
}

challengeRoutes.post('/', async (c) => {
	const db = new ChallengeDB(c.env.DB);

	// Generate challenge
	const challenge = generateChallenge();

	// Store in D1
	await db.create({
		id: challenge.id,
		type: challenge.type,
		prompt: challenge.prompt,
		expected_answer: challenge.expectedAnswer,
		nonce: challenge.nonce,
		parameters: challenge.parameters ? JSON.stringify(challenge.parameters) : null,
		created_at: challenge.createdAt,
		expires_at: challenge.expiresAt,
	});

	// Calculate expiresIn (milliseconds remaining)
	const expiresIn = challenge.expiresAt - Date.now();

	// Return response (NEVER include expectedAnswer)
	const response: ChallengeResponse = {
		challengeId: challenge.id,
		prompt: challenge.prompt,
		expiresIn,
	};

	return c.json(response, 201);
});

export { challengeRoutes };
