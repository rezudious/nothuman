import { isPrime } from './structured-json';

export interface ComputationalArrayResult {
	primeIndices: number[];
	sumOfPrimes: number;
	evenCount: number;
	maxPrime: number | null;
	checksum: number;
}

export interface ComputationalArrayParameters {
	array: number[];
	arrayLength: number;
	[key: string]: unknown;
}

export interface ComputationalArrayChallengeResult {
	prompt: string;
	expectedAnswer: string;
	parameters: ComputationalArrayParameters;
}

function computeStats(array: number[]): Omit<ComputationalArrayResult, 'checksum'> & { xorOfPrimes: number } {
	const primeIndices: number[] = [];
	let sumOfPrimes = 0;
	let evenCount = 0;
	let maxPrime: number | null = null;
	let xorOfPrimes = 0;

	for (let i = 0; i < array.length; i++) {
		const num = array[i];

		if (num % 2 === 0) {
			evenCount++;
		}

		if (isPrime(num)) {
			primeIndices.push(i);
			sumOfPrimes += num;
			xorOfPrimes ^= num;

			if (maxPrime === null || num > maxPrime) {
				maxPrime = num;
			}
		}
	}

	return {
		primeIndices,
		sumOfPrimes,
		evenCount,
		maxPrime,
		xorOfPrimes,
	};
}

function computeChecksum(xorOfPrimes: number, nonce: string): number {
	const nonceValue = parseInt(nonce, 16);
	return (xorOfPrimes ^ nonceValue) % 1000000;
}

export function generateComputationalArrayChallenge(nonce: string): ComputationalArrayChallengeResult {
	// Generate array of 300-600 random numbers (1-2000)
	const arrayLength = 300 + Math.floor(Math.random() * 301);
	const array = Array.from({ length: arrayLength }, () => 1 + Math.floor(Math.random() * 2000));

	// Compute stats
	const { primeIndices, sumOfPrimes, evenCount, maxPrime, xorOfPrimes } = computeStats(array);

	// Compute checksum with nonce
	const checksum = computeChecksum(xorOfPrimes, nonce);

	// Build expected answer
	const expectedResult: ComputationalArrayResult = {
		primeIndices,
		sumOfPrimes,
		evenCount,
		maxPrime,
		checksum,
	};
	const expectedAnswer = JSON.stringify(expectedResult);

	// Build prompt
	const arrayStr = JSON.stringify(array);
	const prompt = `Challenge nonce: ${nonce}

Analyze the following array of ${arrayLength} numbers and compute statistics.

Array: ${arrayStr}

Return a JSON object with:
- "primeIndices": array of indices (0-based) where the value is a prime number
- "sumOfPrimes": sum of all prime numbers in the array
- "evenCount": count of even numbers in the array
- "maxPrime": the largest prime number in the array (null if no primes)
- "checksum": (XOR of all prime numbers) XOR 0x${nonce}, then mod 1000000

A number is prime if it's greater than 1 and only divisible by 1 and itself.

Return format:
{
  "primeIndices": [...],
  "sumOfPrimes": <number>,
  "evenCount": <number>,
  "maxPrime": <number or null>,
  "checksum": <number>
}`;

	return {
		prompt,
		expectedAnswer,
		parameters: { array, arrayLength },
	};
}

export function validateComputationalArray(answer: string, expectedAnswer: string): boolean {
	try {
		const submitted = JSON.parse(answer) as ComputationalArrayResult;
		const expected = JSON.parse(expectedAnswer) as ComputationalArrayResult;

		// Check checksum
		if (submitted.checksum !== expected.checksum) {
			return false;
		}

		// Check sumOfPrimes
		if (submitted.sumOfPrimes !== expected.sumOfPrimes) {
			return false;
		}

		// Check evenCount
		if (submitted.evenCount !== expected.evenCount) {
			return false;
		}

		// Check maxPrime
		if (submitted.maxPrime !== expected.maxPrime) {
			return false;
		}

		// Check primeIndices (same length and same elements)
		if (!Array.isArray(submitted.primeIndices)) {
			return false;
		}

		if (submitted.primeIndices.length !== expected.primeIndices.length) {
			return false;
		}

		for (let i = 0; i < expected.primeIndices.length; i++) {
			if (submitted.primeIndices[i] !== expected.primeIndices[i]) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}
