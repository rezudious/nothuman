import { describe, it, expect } from 'vitest';
import {
	generatePhraseFromNonce,
	generateConstraintTextChallenge,
	validateConstraintText,
} from '../src/challenges/types/constraint-text';
import { generateChallengeOfType } from '../src/challenges/generator';

describe('Constraint Text Challenge', () => {
	describe('generatePhraseFromNonce', () => {
		it('generates deterministic phrase from nonce', () => {
			const nonce = 'a1b2c3d4';
			const phrase1 = generatePhraseFromNonce(nonce);
			const phrase2 = generatePhraseFromNonce(nonce);
			expect(phrase1).toBe(phrase2);
		});

		it('generates different phrases for different nonces', () => {
			const phrase1 = generatePhraseFromNonce('00000001');
			const phrase2 = generatePhraseFromNonce('00000002');
			expect(phrase1).not.toBe(phrase2);
		});

		it('generates phrase between 10-16 characters', () => {
			// Test multiple nonces to cover range
			for (let i = 0; i < 50; i++) {
				const nonce = i.toString(16).padStart(8, '0');
				const phrase = generatePhraseFromNonce(nonce);
				expect(phrase.length).toBeGreaterThanOrEqual(10);
				expect(phrase.length).toBeLessThanOrEqual(16);
			}
		});

		it('generates only uppercase letters', () => {
			const phrase = generatePhraseFromNonce('deadbeef');
			expect(phrase).toMatch(/^[A-Z]+$/);
		});
	});

	describe('generateConstraintTextChallenge', () => {
		it('generates valid challenge structure', () => {
			const nonce = 'a1b2c3d4';
			const result = generateConstraintTextChallenge(nonce);

			expect(result.prompt).toContain(nonce);
			expect(result.prompt).toContain('FIRST LETTER');
			expect(result.expectedAnswer).toBeTruthy();
			expect(result.parameters.phrase).toBe(result.expectedAnswer);
			expect(result.parameters.wordCount).toBe(result.expectedAnswer.length);
		});

		it('includes phrase in prompt', () => {
			const nonce = 'cafebabe';
			const result = generateConstraintTextChallenge(nonce);
			expect(result.prompt).toContain(result.parameters.phrase);
		});

		it('word count matches phrase length', () => {
			const nonce = '12345678';
			const result = generateConstraintTextChallenge(nonce);
			expect(result.parameters.wordCount).toBe(result.parameters.phrase.length);
		});
	});

	describe('validateConstraintText', () => {
		it('validates correct answer', () => {
			const phrase = 'ABC';
			const answer = 'Apple Banana Cherry';
			expect(validateConstraintText(answer, phrase)).toBe(true);
		});

		it('validates case insensitively', () => {
			const phrase = 'ABC';
			const answer = 'apple banana cherry';
			expect(validateConstraintText(answer, phrase)).toBe(true);
		});

		it('rejects wrong first letters', () => {
			const phrase = 'ABC';
			const answer = 'Apple Banana Dog';
			expect(validateConstraintText(answer, phrase)).toBe(false);
		});

		it('rejects wrong word count (too few)', () => {
			const phrase = 'ABC';
			const answer = 'Apple Banana';
			expect(validateConstraintText(answer, phrase)).toBe(false);
		});

		it('rejects wrong word count (too many)', () => {
			const phrase = 'ABC';
			const answer = 'Apple Banana Cherry Dog';
			expect(validateConstraintText(answer, phrase)).toBe(false);
		});

		it('handles multiple spaces between words', () => {
			const phrase = 'ABC';
			const answer = 'Apple   Banana    Cherry';
			expect(validateConstraintText(answer, phrase)).toBe(true);
		});

		it('handles leading/trailing whitespace', () => {
			const phrase = 'ABC';
			const answer = '  Apple Banana Cherry  ';
			expect(validateConstraintText(answer, phrase)).toBe(true);
		});

		it('rejects empty answer', () => {
			const phrase = 'ABC';
			expect(validateConstraintText('', phrase)).toBe(false);
		});

		it('rejects only whitespace', () => {
			const phrase = 'ABC';
			expect(validateConstraintText('   ', phrase)).toBe(false);
		});

		it('validates longer phrases correctly', () => {
			const phrase = 'HELLOWORLD';
			const answer = 'Happy Elephants Love Laughing On Warm Ocean Rocks Lazily Dancing';
			expect(validateConstraintText(answer, phrase)).toBe(true);
		});

		it('rejects malformed input gracefully', () => {
			const phrase = 'ABC';
			expect(validateConstraintText('A', phrase)).toBe(false);
			expect(validateConstraintText('A B', phrase)).toBe(false);
		});
	});

	describe('generateChallengeOfType constraint_text', () => {
		it('generates constraint_text challenge', () => {
			const challenge = generateChallengeOfType('constraint_text');
			expect(challenge.type).toBe('constraint_text');
			expect(challenge.prompt).toContain('FIRST LETTER');
			expect(challenge.expectedAnswer).toMatch(/^[A-Z]+$/);
		});

		it('has parameters with phrase and wordCount', () => {
			const challenge = generateChallengeOfType('constraint_text');
			expect(challenge.parameters).toHaveProperty('phrase');
			expect(challenge.parameters).toHaveProperty('wordCount');
			expect((challenge.parameters as any).phrase).toBe(challenge.expectedAnswer);
		});

		it('includes nonce in prompt', () => {
			const challenge = generateChallengeOfType('constraint_text');
			expect(challenge.prompt).toContain(challenge.nonce);
		});

		it('sets correct TTL', () => {
			const challenge = generateChallengeOfType('constraint_text');
			const ttl = challenge.expiresAt - challenge.createdAt;
			expect(ttl).toBe(3000);
		});
	});

	describe('end-to-end validation', () => {
		it('validates generated challenge with correct answer format', () => {
			const challenge = generateChallengeOfType('constraint_text');
			const phrase = challenge.expectedAnswer;

			// Generate a valid answer
			const words = phrase.split('').map((letter) => letter + 'ord');
			const answer = words.join(' ');

			expect(validateConstraintText(answer, phrase)).toBe(true);
		});
	});
});
