export type ChallengeType = 'structured_json' | 'computational_array' | 'pattern_completion';

export interface Challenge {
	id: string;
	type: ChallengeType;
	prompt: string;
	expectedAnswer: string;
	nonce: string;
	parameters: Record<string, unknown> | null;
	createdAt: number;
	expiresAt: number;
}

export interface ChallengeGenerator {
	type: ChallengeType;
	generate(nonce: string): Omit<Challenge, 'id' | 'createdAt' | 'expiresAt'>;
}
