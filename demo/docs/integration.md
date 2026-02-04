# NotHuman Integration Guide

## Overview

NotHuman is a reverse-CAPTCHA API that verifies AI agents through computational challenges. Unlike traditional CAPTCHAs that block bots, NotHuman challenges are designed to be solved by AI agents, not humans.

## Use Cases

- **AI Agent Marketplaces**: Verify that agents are genuine AI systems
- **API Gateways**: Add AI-only access layers to services
- **Bot Detection**: Distinguish AI agents from simple scripts
- **Authentication Flows**: Add AI verification as a step in agent onboarding

---

## Integration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Your App  │     │  NotHuman   │     │  AI Agent   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  1. Request       │                   │
       │   Challenge       │                   │
       │──────────────────>│                   │
       │                   │                   │
       │  2. Challenge     │                   │
       │   (prompt, id)    │                   │
       │<──────────────────│                   │
       │                   │                   │
       │  3. Forward       │                   │
       │   prompt          │                   │
       │──────────────────────────────────────>│
       │                   │                   │
       │                   │  4. Compute       │
       │                   │   solution        │
       │                   │                   │
       │  5. Return        │                   │
       │   solution        │                   │
       │<──────────────────────────────────────│
       │                   │                   │
       │  6. Submit        │                   │
       │   solution        │                   │
       │──────────────────>│                   │
       │                   │                   │
       │  7. JWT Token     │                   │
       │   (if valid)      │                   │
       │<──────────────────│                   │
       │                   │                   │
       ▼                   ▼                   ▼
```

---

## Step-by-Step Integration

### Step 1: Request a Challenge

```javascript
const response = await fetch('https://api.humanproof.dev/challenge', {
  method: 'POST',
});
const { challengeId, prompt, expiresIn } = await response.json();
```

The challenge expires in ~3 seconds. Start the timer immediately.

### Step 2: Send Prompt to AI Agent

Forward the `prompt` to your AI agent. The prompt contains:
- A unique nonce
- Instructions for the challenge type
- Expected output format

### Step 3: AI Agent Computes Solution

Your AI agent must:
1. Parse the prompt
2. Perform the required computation
3. Format the answer correctly
4. Return within 3 seconds

### Step 4: Submit Solution

```javascript
const verifyResponse = await fetch('https://api.humanproof.dev/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ challengeId, solution }),
});
const { success, token, solveTimeMs } = await verifyResponse.json();
```

### Step 5: Use the Token

On success, you receive a JWT token valid for 24 hours. Use it to:
- Prove AI verification to your backend
- Include in API requests as authentication
- Store for session management

```javascript
// Validate token on your backend
const validateResponse = await fetch('https://api.humanproof.dev/token/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token }),
});
const { valid, payload } = await validateResponse.json();
```

---

## Best Practices

### Timing

| Aspect | Recommendation |
|--------|----------------|
| Start timer | Immediately after receiving challenge |
| Time budget | Keep 500ms buffer (use 2.5s of 3s) |
| Network latency | Account for round-trip time |
| Retry strategy | Get new challenge on timeout |

### Error Handling

```javascript
async function verifyWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const challenge = await getChallenge();
      const solution = await solveChallenge(challenge.prompt);
      const result = await submitSolution(challenge.challengeId, solution);

      if (result.success) return result.token;

      // Invalid solution - try again with new challenge
      console.log(`Attempt ${attempt} failed: ${result.error}`);
    } catch (error) {
      console.log(`Attempt ${attempt} error: ${error.message}`);
    }
  }
  throw new Error('Verification failed after max attempts');
}
```

### Token Management

```javascript
class TokenManager {
  constructor() {
    this.token = null;
    this.expiresAt = null;
  }

  async getValidToken() {
    // Check if token exists and not expired (with 1hr buffer)
    if (this.token && this.expiresAt > Date.now() + 3600000) {
      return this.token;
    }

    // Get new verification
    this.token = await verifyAgent();
    this.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return this.token;
  }
}
```

### Rate Limiting

- `/challenge`: 30 requests/minute
- `/verify`: 60 requests/minute
- `/token/validate`: 100 requests/minute

Implement exponential backoff on 429 responses:

```javascript
async function fetchWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
      await sleep(retryAfter * 1000 * Math.pow(2, i));
      continue;
    }

    return response;
  }
  throw new Error('Rate limit exceeded');
}
```

---

## Security Considerations

### Token Validation

Always validate tokens on your backend:

```javascript
// Server-side validation
app.post('/protected-endpoint', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  const validation = await fetch('https://api.humanproof.dev/token/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const { valid, payload } = await validation.json();

  if (!valid) {
    return res.status(401).json({ error: 'Invalid verification token' });
  }

  // Token is valid - proceed with request
  req.aiVerification = payload;
  // ...
});
```

### Challenge Freshness

- Each challenge can only be solved once
- Challenges expire after 3 seconds
- Nonces are unique per challenge
- Pre-computation attacks are not possible

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Challenge expired` | Solution took >3s. Optimize AI response time. |
| `Invalid solution` | Check output format matches prompt requirements. |
| `Challenge not found` | ChallengeId is invalid or already used. |
| `Rate limit exceeded` | Implement backoff, reduce request frequency. |
| `Token expired` | Token is >24h old. Request new verification. |

---

## Support

- **Demo**: https://nothuman-demo.pages.dev
- **GitHub**: https://github.com/rezudious/nothuman
- **API Status**: GET /health
