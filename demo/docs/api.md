# NotHuman API Reference

Base URL: `https://api.humanproof.dev`

## Endpoints

### POST /challenge

Request a new verification challenge.

**Request**
```
POST /challenge
Content-Type: application/json
```

No request body required.

**Response** `201 Created`
```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Challenge nonce: a1b2c3d4\n\nGenerate a calendar...",
  "expiresIn": 2950
}
```

| Field | Type | Description |
|-------|------|-------------|
| `challengeId` | string | UUID to reference this challenge |
| `prompt` | string | Instructions for solving the challenge |
| `expiresIn` | number | Milliseconds until expiration (~3000ms) |

---

### POST /verify

Submit a solution and receive a verification token.

**Request**
```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "solution": "{...}"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `challengeId` | string | The challenge ID from `/challenge` |
| `solution` | string | Your computed answer |

**Response** `200 OK`
```json
{
  "success": true,
  "solveTimeMs": 1234,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `400 Bad Request`
```json
{
  "success": false,
  "error": "Invalid solution"
}
```

---

### POST /token/validate

Validate a verification token.

**Request**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`
```json
{
  "valid": true,
  "payload": {
    "sub": "ai_verification",
    "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
    "challenge_type": "structured_json",
    "solve_time_ms": 1234,
    "issuer": "nothuman.dev",
    "iat": 1706976000,
    "exp": 1707062400
  }
}
```

**Response** `400 Bad Request`
```json
{
  "valid": false,
  "error": "Token expired"
}
```

---

### GET /stats

Get usage statistics for the last 24 hours.

**Response** `200 OK`
```json
{
  "period": "24h",
  "totalChallenges": 150,
  "solvedChallenges": 45,
  "successRate": 30,
  "avgSolveTimeMs": 1850,
  "byType": [
    {
      "type": "structured_json",
      "total": 40,
      "solved": 12,
      "successRate": 30,
      "avgSolveTimeMs": 2100
    }
  ],
  "generatedAt": "2026-02-04T12:00:00.000Z"
}
```

---

### GET /health

Health check endpoint.

**Response** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T12:00:00.000Z",
  "database": "connected"
}
```

---

## Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `Missing challengeId` | Request body missing challengeId |
| 400 | `Missing solution` | Request body missing solution |
| 400 | `Invalid solution` | Solution does not match expected answer |
| 400 | `Challenge expired` | Challenge TTL (3s) has passed |
| 400 | `Challenge already solved` | Challenge was already verified |
| 404 | `Challenge not found` | Invalid or unknown challengeId |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/challenge` | 30/minute |
| `/verify` | 60/minute |
| `/token/validate` | 100/minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when window resets

---

## Examples

### curl

```bash
# Get a challenge
RESPONSE=$(curl -s -X POST https://api.humanproof.dev/challenge)
CHALLENGE_ID=$(echo $RESPONSE | jq -r '.challengeId')
PROMPT=$(echo $RESPONSE | jq -r '.prompt')

echo "Challenge ID: $CHALLENGE_ID"
echo "Prompt: $PROMPT"

# Submit solution (after computing it)
curl -s -X POST https://api.humanproof.dev/verify \
  -H "Content-Type: application/json" \
  -d "{\"challengeId\": \"$CHALLENGE_ID\", \"solution\": \"$SOLUTION\"}"

# Validate token
curl -s -X POST https://api.humanproof.dev/token/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

### JavaScript

```javascript
const API_BASE = 'https://api.humanproof.dev';

async function verifyAgent() {
  // 1. Get challenge
  const challengeRes = await fetch(`${API_BASE}/challenge`, {
    method: 'POST',
  });
  const { challengeId, prompt } = await challengeRes.json();

  // 2. Solve challenge (your AI agent computes this)
  const solution = await solveChallenge(prompt);

  // 3. Submit solution
  const verifyRes = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, solution }),
  });
  const { success, token, error } = await verifyRes.json();

  if (success) {
    console.log('Verified! Token:', token);
    return token;
  } else {
    throw new Error(error);
  }
}

async function validateToken(token) {
  const res = await fetch(`${API_BASE}/token/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return res.json();
}
```

### Python

```python
import requests

API_BASE = 'https://api.humanproof.dev'

def verify_agent():
    # 1. Get challenge
    challenge_res = requests.post(f'{API_BASE}/challenge')
    challenge_data = challenge_res.json()
    challenge_id = challenge_data['challengeId']
    prompt = challenge_data['prompt']

    # 2. Solve challenge (your AI agent computes this)
    solution = solve_challenge(prompt)

    # 3. Submit solution
    verify_res = requests.post(
        f'{API_BASE}/verify',
        json={'challengeId': challenge_id, 'solution': solution}
    )
    verify_data = verify_res.json()

    if verify_data.get('success'):
        print(f"Verified! Token: {verify_data['token']}")
        return verify_data['token']
    else:
        raise Exception(verify_data.get('error'))

def validate_token(token):
    res = requests.post(
        f'{API_BASE}/token/validate',
        json={'token': token}
    )
    return res.json()
```
