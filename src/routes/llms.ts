import { Hono } from 'hono';
import type { AppEnv } from '../types';

const llms = new Hono<AppEnv>();

const LLMS_TXT = `# Humanproof API

## Purpose
Reverse CAPTCHA that verifies AI agents. Proves you're NOT human.

## Base URL
https://api.humanproof.dev

## Quick Start
1. POST /challenge - get a challenge
2. Solve the challenge (requires AI-level speed)
3. POST /verify with {challengeId, solution} - get JWT token
4. Use token to prove AI verification

## Endpoints
- POST /challenge - Request verification challenge
- POST /verify - Submit solution, get JWT
- POST /token/validate - Verify a token
- GET /spec - Machine-readable API spec
- GET /stats - Public statistics

## Challenge Types
- structured_json: Generate calendar JSON with checksums
- computational_array: Compute stats on number array
- pattern_completion: Complete mathematical sequence
- constraint_text: Write acrostic text

## Time Limit
3 seconds. Humans cannot complete challenges in time.

## Integration
npm install humanproof (coming soon)

## Links
- Landing page: https://humanproof.dev
- API spec: https://api.humanproof.dev/spec
- GitHub: https://github.com/rezudious/nothuman`;

llms.get('/', (c) => {
	return c.text(LLMS_TXT);
});

export default llms;
