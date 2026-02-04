import { Hono } from 'hono';
import type { AppEnv } from '../index';

const badge = new Hono<AppEnv>();

function generateBadge(status: 'operational' | 'down'): string {
	const isOperational = status === 'operational';
	const color = isOperational ? '#22c55e' : '#ef4444';
	const statusText = isOperational ? 'operational' : 'down';

	// Badge dimensions
	const labelWidth = 80;
	const statusWidth = isOperational ? 75 : 40;
	const totalWidth = labelWidth + statusWidth;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="Humanproof: ${statusText}">
  <title>Humanproof: ${statusText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)"textLength="${(labelWidth - 10) * 10}">Humanproof</text>
    <text x="${labelWidth * 5}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">Humanproof</text>
    <text aria-hidden="true" x="${(labelWidth + statusWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(statusWidth - 10) * 10}">${statusText}</text>
    <text x="${(labelWidth + statusWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(statusWidth - 10) * 10}">${statusText}</text>
  </g>
</svg>`;
}

badge.get('/', async (c) => {
	let isHealthy = false;

	try {
		// Check D1 connection
		await c.env.DB.prepare('SELECT 1').first();
		isHealthy = true;
	} catch {
		isHealthy = false;
	}

	const svg = generateBadge(isHealthy ? 'operational' : 'down');

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		},
	});
});

export default badge;
