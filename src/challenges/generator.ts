import type { Challenge, ChallengeType, ChallengeGenerator } from './types';
import { generateNonce } from '../utils/nonce';
import { generateStructuredJsonChallenge } from './types/structured-json';

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
		const length = 5 + Math.floor(Math.random() * 6); // 5-10 elements
		const numbers = Array.from({ length }, () => Math.floor(Math.random() * 100));

		const operations = ['sum', 'product_mod_1000', 'max_minus_min', 'count_even'] as const;
		const operation = operations[Math.floor(Math.random() * operations.length)];

		let result: number;
		switch (operation) {
			case 'sum':
				result = numbers.reduce((a, b) => a + b, 0);
				break;
			case 'product_mod_1000':
				result = numbers.reduce((a, b) => (a * b) % 1000, 1);
				break;
			case 'max_minus_min':
				result = Math.max(...numbers) - Math.min(...numbers);
				break;
			case 'count_even':
				result = numbers.filter((n) => n % 2 === 0).length;
				break;
		}

		const operationDescriptions: Record<string, string> = {
			sum: 'Calculate the sum of all numbers',
			product_mod_1000: 'Calculate the product of all numbers modulo 1000',
			max_minus_min: 'Calculate the difference between the maximum and minimum values',
			count_even: 'Count how many even numbers are in the array',
		};

		const prompt = `Given the array [${numbers.join(', ')}], ${operationDescriptions[operation].toLowerCase()}. Return JSON: {"result": <number>, "nonce": "${nonce}"}`;

		const expectedAnswer = JSON.stringify({ result, nonce });

		return {
			type: 'computational_array' as const,
			prompt,
			expectedAnswer,
			nonce,
			parameters: { numbers, operation },
		};
	},
};

const generators: ChallengeGenerator[] = [structuredJsonGenerator, computationalArrayGenerator];

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
