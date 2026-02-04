import { isPrime } from './structured-json';

export interface PatternCompletionResult {
	primeIndexTerms: number[];
	checksum: number;
}

export interface PatternCompletionParameters {
	seed1: number;
	seed2: number;
	multiplier: number;
	operation: 'add' | 'subtract';
	totalTerms: number;
	primeIndices: number[];
	[key: string]: unknown;
}

export interface PatternCompletionChallengeResult {
	prompt: string;
	expectedAnswer: string;
	parameters: PatternCompletionParameters;
}

function deriveSeedsFromNonce(nonce: string): { seed1: number; seed2: number } {
	const seed1 = (parseInt(nonce.slice(0, 4), 16) % 100) + 1;
	const seed2 = (parseInt(nonce.slice(4, 8), 16) % 100) + 1;
	return { seed1, seed2 };
}

function generateSequence(
	seed1: number,
	seed2: number,
	multiplier: number,
	operation: 'add' | 'subtract',
	totalTerms: number
): number[] {
	const sequence: number[] = [seed1, seed2];

	for (let i = 2; i < totalTerms; i++) {
		const prev = sequence[i - 1];
		const prevPrev = sequence[i - 2];

		let nextTerm: number;
		if (operation === 'add') {
			nextTerm = prev * multiplier + prevPrev;
		} else {
			nextTerm = prev * multiplier - prevPrev;
		}

		sequence.push(nextTerm);
	}

	return sequence;
}

function getPrimeIndices(maxIndex: number): number[] {
	const primes: number[] = [];
	for (let i = 2; i <= maxIndex; i++) {
		if (isPrime(i)) {
			primes.push(i);
		}
	}
	return primes;
}

function computeChecksum(primeIndexTerms: number[], nonce: string): number {
	const sum = primeIndexTerms.reduce((a, b) => a + b, 0);
	const nonceValue = parseInt(nonce, 16);
	return (sum ^ nonceValue) % 1000000;
}

export function generatePatternCompletionChallenge(nonce: string): PatternCompletionChallengeResult {
	// Derive seeds from nonce
	const { seed1, seed2 } = deriveSeedsFromNonce(nonce);

	// Random parameters
	const multiplier = 2 + Math.floor(Math.random() * 6); // 2-7
	const operation: 'add' | 'subtract' = Math.random() < 0.5 ? 'add' : 'subtract';
	const totalTerms = 15 + Math.floor(Math.random() * 16); // 15-30

	// Generate sequence
	const sequence = generateSequence(seed1, seed2, multiplier, operation, totalTerms);

	// Get prime indices (0-based, so we look for indices 2,3,5,7,11,13,17,19,23,29)
	const primeIndices = getPrimeIndices(totalTerms - 1);

	// Extract terms at prime indices
	const primeIndexTerms = primeIndices.map((i) => sequence[i]);

	// Compute checksum
	const checksum = computeChecksum(primeIndexTerms, nonce);

	// Build expected answer
	const expectedResult: PatternCompletionResult = {
		primeIndexTerms,
		checksum,
	};
	const expectedAnswer = JSON.stringify(expectedResult);

	// Build operation description
	const opSymbol = operation === 'add' ? '+' : '-';
	const operationDesc = `(previous term * ${multiplier}) ${opSymbol} (term before that)`;

	// Build prompt
	const prompt = `Challenge nonce: ${nonce}

Complete a mathematical sequence.

Starting values: [${seed1}, ${seed2}]
Recurrence relation: each term = ${operationDesc}
Total terms to generate: ${totalTerms}

For example, with starting values [a, b]:
- Term at index 0: ${seed1}
- Term at index 1: ${seed2}
- Term at index 2: (${seed2} * ${multiplier}) ${opSymbol} ${seed1} = ${sequence[2]}
- Term at index 3: (${sequence[2]} * ${multiplier}) ${opSymbol} ${seed2} = ${sequence[3]}
- And so on...

Return only the values at PRIME indices (indices: ${primeIndices.join(', ')}).

Return format:
{
  "primeIndexTerms": [<term at index 2>, <term at index 3>, <term at index 5>, ...],
  "checksum": (sum of all prime index terms) XOR 0x${nonce}, then mod 1000000
}`;

	return {
		prompt,
		expectedAnswer,
		parameters: {
			seed1,
			seed2,
			multiplier,
			operation,
			totalTerms,
			primeIndices,
		},
	};
}

export function validatePatternCompletion(answer: string, expectedAnswer: string): boolean {
	try {
		const submitted = JSON.parse(answer) as PatternCompletionResult;
		const expected = JSON.parse(expectedAnswer) as PatternCompletionResult;

		// Check checksum
		if (submitted.checksum !== expected.checksum) {
			return false;
		}

		// Check primeIndexTerms
		if (!Array.isArray(submitted.primeIndexTerms)) {
			return false;
		}

		if (submitted.primeIndexTerms.length !== expected.primeIndexTerms.length) {
			return false;
		}

		for (let i = 0; i < expected.primeIndexTerms.length; i++) {
			if (submitted.primeIndexTerms[i] !== expected.primeIndexTerms[i]) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}
