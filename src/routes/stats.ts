import { Hono } from 'hono';
import type { AppEnv } from '../index';

const statsRoutes = new Hono<AppEnv>();

interface TypeBreakdown {
	type: string;
	total: number;
	solved: number;
	successRate: number;
	avgSolveTimeMs: number | null;
}

interface StatsResponse {
	period: '24h';
	totalChallenges: number;
	solvedChallenges: number;
	successRate: number;
	avgSolveTimeMs: number | null;
	byType: TypeBreakdown[];
	generatedAt: string;
}

statsRoutes.get('/', async (c) => {
	const db = c.env.DB;
	const now = Date.now();
	const oneDayAgo = now - 24 * 60 * 60 * 1000;

	// Total challenges in last 24h
	const totalResult = await db
		.prepare('SELECT COUNT(*) as count FROM challenges WHERE created_at >= ?')
		.bind(oneDayAgo)
		.first<{ count: number }>();

	// Solved challenges in last 24h
	const solvedResult = await db
		.prepare('SELECT COUNT(*) as count FROM challenges WHERE created_at >= ? AND solved = 1')
		.bind(oneDayAgo)
		.first<{ count: number }>();

	// Average solve time for solved challenges in last 24h
	const avgTimeResult = await db
		.prepare('SELECT AVG(solve_time_ms) as avg FROM challenges WHERE created_at >= ? AND solved = 1')
		.bind(oneDayAgo)
		.first<{ avg: number | null }>();

	// Breakdown by type
	const byTypeResult = await db
		.prepare(
			`SELECT
				type,
				COUNT(*) as total,
				SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END) as solved,
				AVG(CASE WHEN solved = 1 THEN solve_time_ms ELSE NULL END) as avg_solve_time
			FROM challenges
			WHERE created_at >= ?
			GROUP BY type`
		)
		.bind(oneDayAgo)
		.all<{ type: string; total: number; solved: number; avg_solve_time: number | null }>();

	const totalChallenges = totalResult?.count ?? 0;
	const solvedChallenges = solvedResult?.count ?? 0;
	const successRate = totalChallenges > 0 ? Math.round((solvedChallenges / totalChallenges) * 10000) / 100 : 0;
	const avgSolveTimeMs = avgTimeResult?.avg ? Math.round(avgTimeResult.avg) : null;

	const byType: TypeBreakdown[] = (byTypeResult.results ?? []).map((row) => ({
		type: row.type,
		total: row.total,
		solved: row.solved,
		successRate: row.total > 0 ? Math.round((row.solved / row.total) * 10000) / 100 : 0,
		avgSolveTimeMs: row.avg_solve_time ? Math.round(row.avg_solve_time) : null,
	}));

	const response: StatsResponse = {
		period: '24h',
		totalChallenges,
		solvedChallenges,
		successRate,
		avgSolveTimeMs,
		byType,
		generatedAt: new Date().toISOString(),
	};

	return c.json(response, 200);
});

export { statsRoutes };
