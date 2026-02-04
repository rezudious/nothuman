import type { D1Database } from '@cloudflare/workers-types';

// Challenge record type
export interface Challenge {
	id: string;
	type: string;
	prompt: string;
	expected_answer: string;
	nonce: string;
	parameters: string | null;
	created_at: number;
	expires_at: number;
	solved: number;
	solved_at: number | null;
	solve_time_ms: number | null;
}

// Insert challenge input (omit auto-generated fields)
export type CreateChallengeInput = Omit<Challenge, 'solved' | 'solved_at' | 'solve_time_ms'>;

// Database helper class
export class ChallengeDB {
	constructor(private db: D1Database) {}

	async create(challenge: CreateChallengeInput): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO challenges (id, type, prompt, expected_answer, nonce, parameters, created_at, expires_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				challenge.id,
				challenge.type,
				challenge.prompt,
				challenge.expected_answer,
				challenge.nonce,
				challenge.parameters,
				challenge.created_at,
				challenge.expires_at
			)
			.run();
	}

	async getById(id: string): Promise<Challenge | null> {
		return await this.db
			.prepare('SELECT * FROM challenges WHERE id = ?')
			.bind(id)
			.first<Challenge>();
	}

	async markSolved(id: string, solveTimeMs: number): Promise<void> {
		const now = Date.now();
		await this.db
			.prepare(
				`UPDATE challenges
				 SET solved = 1, solved_at = ?, solve_time_ms = ?
				 WHERE id = ?`
			)
			.bind(now, solveTimeMs, id)
			.run();
	}

	async deleteExpired(): Promise<number> {
		const now = Date.now();
		const result = await this.db
			.prepare('DELETE FROM challenges WHERE expires_at < ?')
			.bind(now)
			.run();
		return result.meta.changes ?? 0;
	}

	async delete(id: string): Promise<void> {
		await this.db.prepare('DELETE FROM challenges WHERE id = ?').bind(id).run();
	}
}
