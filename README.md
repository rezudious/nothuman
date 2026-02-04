# NotHuman

```
    _   _       _   _   _
   | \ | | ___ | |_| | | |_   _ _ __ ___   __ _ _ __
   |  \| |/ _ \| __| |_| | | | | '_ ` _ \ / _` | '_ \
   | |\  | (_) | |_|  _  | |_| | | | | | | (_| | | | |
   |_| \_|\___/ \__|_| |_|\__,_|_| |_| |_|\__,_|_| |_|

              Prove you're not human.
```

![Humanproof Status](https://api.humanproof.dev/badge)
[![Deploy Status](https://img.shields.io/badge/deploy-cloudflare-orange)](https://api.humanproof.dev)
[![Tests](https://img.shields.io/badge/tests-176%20passing-brightgreen)](https://github.com/rezudious/nothuman)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-purple)](https://github.com/rezudious/nothuman/releases)

A reverse-CAPTCHA API that verifies AI agents through computational challenges. Unlike traditional CAPTCHAs that block bots, NotHuman challenges are designed to be solved by AI systems, not humans.

**[Live Demo](https://nothuman-demo.pages.dev)** | **[Documentation](https://nothuman-demo.pages.dev/docs/)** | **[API Reference](https://nothuman-demo.pages.dev/docs/api.md)**

---

## Features

- **Reverse CAPTCHA** - Verify AI agents, not block them
- **4 Challenge Types** - Computational, structured, pattern, and text challenges
- **3-Second TTL** - Time-constrained challenges prevent human solving
- **JWT Tokens** - Cryptographically signed verification tokens (24h validity)
- **Nonce-Based** - Each challenge is unique, preventing pre-computation
- **Rate Limited** - Built-in protection against abuse
- **Edge Deployed** - Global low-latency via Cloudflare Workers
- **Open Source** - MIT licensed, self-hostable

---

## Quick Start

### 1. Get a Challenge

```bash
curl -X POST https://api.humanproof.dev/challenge
```

```json
{
  "challengeId": "550e8400-e29b-41d4-a716-446655440000",
  "prompt": "Challenge nonce: a1b2c3d4\n\nGenerate a calendar...",
  "expiresIn": 2950
}
```

### 2. Solve & Submit (within 3 seconds)

```bash
curl -X POST https://api.humanproof.dev/verify \
  -H "Content-Type: application/json" \
  -d '{"challengeId": "...", "solution": "{...}"}'
```

```json
{
  "success": true,
  "solveTimeMs": 1847,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 3. Validate Token

```bash
curl -X POST https://api.humanproof.dev/token/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "eyJhbG..."}'
```

```json
{
  "valid": true,
  "payload": {
    "sub": "ai_verification",
    "challenge_id": "550e8400-...",
    "challenge_type": "structured_json",
    "solve_time_ms": 1847
  }
}
```

---

## Challenge Types

NotHuman uses four types of computational challenges that AI can solve but humans cannot complete within the 3-second time limit.

### Structured JSON
Generate a 12-month calendar with computed properties (isPrime, isEven, etc.) for each day, plus a checksum.

```
Difficulty: Medium | Output: ~365 objects | Checksum: Required
```

### Computational Array
Analyze a large array (300-600 numbers) to find primes, compute statistics, and generate an XOR checksum.

```
Difficulty: Medium | Array Size: 300-600 | Prime Detection: Required
```

### Pattern Completion
Complete a Fibonacci-like sequence with custom recurrence relation, extract values at prime indices.

```
Difficulty: Hard | Sequence Length: 15-30 | Math: Recurrence + XOR
```

### Constraint Text
Generate words whose first letters spell out a deterministically-generated phrase (acrostic).

```
Difficulty: Easy | Phrase Length: 10-16 | Output: Plain text
```

[Full challenge documentation →](https://nothuman-demo.pages.dev/docs/challenges.md)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/challenge` | Generate a new challenge |
| `POST` | `/verify` | Submit solution, receive JWT |
| `POST` | `/token/validate` | Validate a token |
| `GET` | `/stats` | Usage statistics (24h) |
| `GET` | `/health` | Health check |
| `GET` | `/spec` | Machine-readable API spec (JSON) |
| `GET` | `/llms.txt` | AI agent discoverability (plain text) |
| `GET` | `/badge` | Status badge (SVG) |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/challenge` | 30/min |
| `/verify` | 60/min |
| `/token/validate` | 100/min |

[Full API documentation →](https://nothuman-demo.pages.dev/docs/api.md)

---

## Integration

### JavaScript

```javascript
const API = 'https://api.humanproof.dev';

async function verifyAgent() {
  // 1. Get challenge
  const { challengeId, prompt } = await fetch(`${API}/challenge`, {
    method: 'POST'
  }).then(r => r.json());

  // 2. Solve (your AI computes this)
  const solution = await yourAI.solve(prompt);

  // 3. Submit
  const { success, token } = await fetch(`${API}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, solution })
  }).then(r => r.json());

  return token;
}
```

### Python

```python
import requests

API = 'https://api.humanproof.dev'

def verify_agent():
    # 1. Get challenge
    challenge = requests.post(f'{API}/challenge').json()

    # 2. Solve (your AI computes this)
    solution = your_ai.solve(challenge['prompt'])

    # 3. Submit
    result = requests.post(f'{API}/verify', json={
        'challengeId': challenge['challengeId'],
        'solution': solution
    }).json()

    return result.get('token')
```

[Full integration guide →](https://nothuman-demo.pages.dev/docs/integration.md)

---

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (for deployment)

### Setup

```bash
# Clone the repo
git clone https://github.com/rezudious/nothuman.git
cd nothuman

# Install dependencies
npm install

# Set up environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your JWT_SECRET

# Run locally
npm run dev

# Run tests
npm test

# Deploy
npm run deploy
```

### Project Structure

```
nothuman-api/
├── src/
│   ├── challenges/      # Challenge generators & validators
│   ├── routes/          # API endpoints
│   ├── middleware/      # CORS, rate limiting, errors
│   ├── auth/            # JWT token handling
│   └── utils/           # Logger, nonce generation
├── test/                # Vitest test suites
├── demo/                # Interactive demo site
└── docs/                # Documentation
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork & Branch** - Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Code Style** - Follow existing patterns, use TypeScript

3. **Tests** - Add tests for new functionality
   ```bash
   npm test
   ```

4. **Commit** - Use conventional commits
   ```
   feat(challenges): add new challenge type
   fix(verify): handle edge case
   docs: update API reference
   ```

5. **PR** - Open a pull request with a clear description

### Ideas for Contributions

- [ ] New challenge types
- [ ] SDK packages (npm, pip, etc.)
- [ ] Dashboard UI for stats
- [ ] Webhook notifications
- [ ] Custom challenge difficulty levels

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links

- **API**: https://api.humanproof.dev
- **Demo**: https://nothuman-demo.pages.dev
- **Docs**: https://nothuman-demo.pages.dev/docs/
- **GitHub**: https://github.com/rezudious/nothuman

---

<p align="center">
  <sub>Built with Cloudflare Workers, Hono, and D1</sub>
</p>
