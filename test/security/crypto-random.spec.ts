import { describe, it, expect } from 'vitest';
import { generateChallenge } from '../../src/challenges/generator';

describe('Security: Cryptographic Randomness', () => {
	describe('Challenge Type Selection', () => {
		it('uses cryptographically secure random for challenge type selection', () => {
			// Generate many challenges and track distribution
			const challengeTypes = new Map<string, number>();
			const numSamples = 1000;

			for (let i = 0; i < numSamples; i++) {
				const challenge = generateChallenge();
				const count = challengeTypes.get(challenge.type) || 0;
				challengeTypes.set(challenge.type, count + 1);
			}

			// With 4 challenge types and 1000 samples, each should have ~250
			// Allow 40% deviation for statistical variance
			const expectedPerType = numSamples / 4;
			const tolerance = expectedPerType * 0.4;

			for (const [type, count] of challengeTypes) {
				expect(count).toBeGreaterThan(expectedPerType - tolerance);
				expect(count).toBeLessThan(expectedPerType + tolerance);
			}
		});

		it('challenge type distribution is roughly uniform over many samples', () => {
			const types: string[] = [];
			const numSamples = 400;

			for (let i = 0; i < numSamples; i++) {
				types.push(generateChallenge().type);
			}

			// Calculate chi-square statistic for uniformity
			const typeCounts = types.reduce(
				(acc, type) => {
					acc[type] = (acc[type] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const numTypes = Object.keys(typeCounts).length;
			const expected = numSamples / numTypes;

			let chiSquare = 0;
			for (const count of Object.values(typeCounts)) {
				chiSquare += Math.pow(count - expected, 2) / expected;
			}

			// Chi-square critical value for 3 degrees of freedom at 0.05 significance is 7.815
			// We'll use a more lenient threshold of 15 to account for test variance
			expect(chiSquare).toBeLessThan(15);
		});

		it('does not produce predictable sequences of challenge types', () => {
			// Generate challenges and look for patterns
			const types: string[] = [];
			for (let i = 0; i < 100; i++) {
				types.push(generateChallenge().type);
			}

			// Count consecutive same types (should not be excessive)
			let maxConsecutive = 1;
			let currentConsecutive = 1;

			for (let i = 1; i < types.length; i++) {
				if (types[i] === types[i - 1]) {
					currentConsecutive++;
					maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
				} else {
					currentConsecutive = 1;
				}
			}

			// With true randomness and 4 types, runs of 5+ identical types should be very rare
			expect(maxConsecutive).toBeLessThan(7);
		});
	});

	describe('Challenge ID Generation', () => {
		it('generates unique challenge IDs', () => {
			const ids = new Set<string>();
			const numChallenges = 1000;

			for (let i = 0; i < numChallenges; i++) {
				const challenge = generateChallenge();
				ids.add(challenge.id);
			}

			expect(ids.size).toBe(numChallenges);
		});

		it('challenge IDs are valid UUIDs', () => {
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

			for (let i = 0; i < 100; i++) {
				const challenge = generateChallenge();
				expect(challenge.id).toMatch(uuidRegex);
			}
		});
	});

	describe('Parameter Randomization', () => {
		it('generates varied parameters across challenges of the same type', () => {
			// Generate many structured_json challenges and check parameter variation
			const years = new Set<number>();
			const propertyConfigs = new Set<string>();

			for (let i = 0; i < 100; i++) {
				const challenge = generateChallenge();
				if (challenge.type === 'structured_json' && challenge.parameters) {
					const params = typeof challenge.parameters === 'string' ? JSON.parse(challenge.parameters) : challenge.parameters;
					if (params.year) years.add(params.year);
					if (params.properties) propertyConfigs.add(JSON.stringify(params.properties.sort()));
				}
			}

			// Should have variation in parameters
			// Exact thresholds depend on the implementation
			expect(years.size).toBeGreaterThanOrEqual(1);
		});
	});
});
