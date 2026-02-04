import type { Challenge, ChallengeType, ChallengeGenerator } from './types';
import { generateNonce } from '../utils/nonce';
import { generateStructuredJsonChallenge } from './types/structured-json';
import { generateComputationalArrayChallenge } from './types/computational-array';
import { generatePatternCompletionChallenge } from './types/pattern-completion';

const CHALLENGE_TTL_MS = 3000; // 3 seconds

// Structured JSON challenge generator
const structuredJsonGenerator: ChallengeGenerator = {
	type: 'structured_json',
	generate(nonce: string) {
		const result = generateStructuredJsonChallenge(nonce);
		return {
			type: 'structured_json' as const,
			prompt: result.prompt,
			expectedAnswer: result.expectedAnswer,
			nonce,
			parameters: result.parameters,
		};
	},
};

// Computational array challenge generator
const computationalArrayGenerator: ChallengeGenerator = {
	type: 'computational_array',
	generate(nonce: string) {
		const result = generateComputationalArrayChallenge(nonce);
		return {
			type: 'computational_array' as const,
			prompt: result.prompt,
			expectedAnswer: result.expectedAnswer,
			nonce,
			parameters: result.parameters,
		};
	},
};

// Pattern completion challenge generator
const patternCompletionGenerator: ChallengeGenerator = {
	type: 'pattern_completion',
	generate(nonce: string) {
		const result = generatePatternCompletionChallenge(nonce);
		return {
			type: 'pattern_completion' as const,
			prompt: result.prompt,
			expectedAnswer: result.expectedAnswer,
			nonce,
			parameters: result.parameters,
		};
	},
};

const generators: ChallengeGenerator[] = [structuredJsonGenerator, computationalArrayGenerator, patternCompletionGenerator];

export function generateChallenge(): Challenge {
	const generator = generators[Math.floor(Math.random() * generators.length)];
	const nonce = generateNonce();
	const challenge = generator.generate(nonce);

	const now = Date.now();

	return {
		id: crypto.randomUUID(),
		...challenge,
		createdAt: now,
		expiresAt: now + CHALLENGE_TTL_MS,
	};
}

export function generateChallengeOfType(type: ChallengeType): Challenge {
	const generator = generators.find((g) => g.type === type);
	if (!generator) {
		throw new Error(`Unknown challenge type: ${type}`);
	}

	const nonce = generateNonce();
	const challenge = generator.generate(nonce);

	const now = Date.now();

	return {
		id: crypto.randomUUID(),
		...challenge,
		createdAt: now,
		expiresAt: now + CHALLENGE_TTL_MS,
	};
}
