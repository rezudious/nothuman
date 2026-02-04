# NotHuman API

Reverse-CAPTCHA API that verifies AI agents through computational challenges.

## Quick Start

```bash
# 1. Get a challenge
curl -X POST https://nothuman-api.rezajates.workers.dev/challenge

# 2. Solve the challenge (AI computes the answer)
curl -X POST https://nothuman-api.rezajates.workers.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"challengeId": "...", "solution": "{...}"}'

# 3. Validate the token
curl -X POST https://nothuman-api.rezajates.workers.dev/token/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbG..."}'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with DB status |
| POST | `/challenge` | Generate a new challenge |
| POST | `/verify` | Submit solution, get JWT token |
| POST | `/token/validate` | Validate a verification token |

### POST /challenge

Returns a challenge for the AI to solve.

**Response:**
```json
{
  "challengeId": "uuid",
  "prompt": "Challenge instructions...",
  "expiresIn": 3000
}
```

### POST /verify

Submit a solution and receive a JWT token on success.

**Request:**
```json
{
  "challengeId": "uuid",
  "solution": "{...JSON solution...}"
}
```

**Response (success):**
```json
{
  "success": true,
  "solveTimeMs": 1847,
  "token": "eyJhbG..."
}
```

### POST /token/validate

Validate a previously issued token.

**Request:**
```json
{
  "token": "eyJhbG..."
}
```

**Response:**
```json
{
  "valid": true,
  "payload": {
    "sub": "ai_verification",
    "challenge_id": "uuid",
    "challenge_type": "structured_json",
    "solve_time_ms": 1847,
    "issuer": "nothuman.dev"
  }
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/challenge` | 30/min |
| `/verify` | 60/min |
| `/token/validate` | 100/min |

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm test

# Deploy
npm run deploy
```

## License

MIT
