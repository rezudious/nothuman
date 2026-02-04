export interface ConstraintTextParameters {
	phrase: string;
	wordCount: number;
	[key: string]: unknown;
}

export interface ConstraintTextChallengeResult {
	prompt: string;
	expectedAnswer: string;
	parameters: ConstraintTextParameters;
}

/**
 * Generates a deterministic phrase from nonce.
 * ~4 billion unique phrases possible (2^32 nonce values).
 */
export function generatePhraseFromNonce(nonce: string): string {
	const seed = parseInt(nonce, 16);
	const length = 10 + (seed % 7); // 10-16 chars

	let s = seed;
	const random = () => {
		s = (s * 1103515245 + 12345) & 0x7fffffff;
		return s / 0x7fffffff;
	};

	let phrase = '';
	for (let i = 0; i < length; i++) {
		phrase += String.fromCharCode(65 + Math.floor(random() * 26));
	}
	return phrase;
}

export function generateConstraintTextChallenge(nonce: string): ConstraintTextChallengeResult {
	// Generate phrase from nonce
	const phrase = generatePhraseFromNonce(nonce);
	const wordCount = phrase.length;

	// Build prompt
	const prompt = `Challenge nonce: ${nonce}

Write ${wordCount} words where the FIRST LETTER of each word spells out: ${phrase}

Rules:
- Exactly ${wordCount} words required
- First letter of word 1 must be "${phrase[0]}"
- First letter of word 2 must be "${phrase[1]}"
- And so on...
- Letters are case-insensitive
- Words must be separated by spaces

Return ONLY the text (no JSON, no quotes, just the words).

Example format: Word1 Word2 Word3 ...`;

	return {
		prompt,
		expectedAnswer: phrase,
		parameters: {
			phrase,
			wordCount,
		},
	};
}

export function validateConstraintText(answer: string, expectedPhrase: string): boolean {
	try {
		// Trim and split into words
		const words = answer.trim().split(/\s+/);

		// Check word count matches phrase length
		if (words.length !== expectedPhrase.length) {
			return false;
		}

		// Check first letters match (case insensitive)
		for (let i = 0; i < expectedPhrase.length; i++) {
			const word = words[i];
			if (!word || word.length === 0) {
				return false;
			}

			const firstLetter = word[0].toUpperCase();
			const expectedLetter = expectedPhrase[i].toUpperCase();

			if (firstLetter !== expectedLetter) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}
