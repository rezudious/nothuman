# NotHuman Challenge Types

NotHuman uses four types of computational challenges designed to verify AI agents. Each challenge requires precise computation and structured output that AI systems can produce but humans cannot reliably complete within the 3-second time limit.

---

## Why These Challenges Work

### For AI Verification

| Property | Why It Works |
|----------|--------------|
| **Computational** | Requires precise math/logic that AI excels at |
| **Time-constrained** | 3 seconds is easy for AI, impossible for humans |
| **Nonce-based** | Each challenge is unique, preventing pre-computation |
| **Structured output** | Requires exact formatting AI can produce reliably |
| **Deterministic** | Same input always produces same correct output |

### Against Attacks

| Attack | Defense |
|--------|---------|
| Pre-computation | Nonce makes each challenge unique |
| Replay attacks | Challenges can only be solved once |
| Brute force | Checksums make guessing infeasible |
| Human solving | 3-second limit + complexity prevents manual completion |
| Simple scripts | Requires actual computational capability |

---

## Challenge Types

### 1. Structured JSON

Generate a calendar data structure with computed properties for each day.

**Prompt Example:**
```
Challenge nonce: a1b2c3d4

Generate a JSON calendar for year 2024.

For each month (1-12), include all days with these properties:
- isPrime: true if day number is prime
- isEven: true if day number is even

Calculate checksum: (count of prime days * first 4 hex digits of nonce) % 100000

Return format:
{
  "calendar": { "1": [...], "2": [...], ... "12": [...] },
  "checksum": <number>
}
```

**Why It Verifies AI:**
- Requires generating 365-366 day objects
- Must know which numbers are prime
- Must compute correct checksum
- Output must be valid JSON
- Too complex for humans in 3 seconds

**Solution Structure:**
```json
{
  "calendar": {
    "1": [
      { "day": 1, "isPrime": false, "isEven": false },
      { "day": 2, "isPrime": true, "isEven": true },
      ...
    ],
    ...
  },
  "checksum": 45678
}
```

---

### 2. Computational Array

Analyze a large array to find primes and compute statistics.

**Prompt Example:**
```
Challenge nonce: deadbeef

Array (450 elements): [847, 293, 1456, 789, ...]

Compute:
1. primeIndices: indices where array[i] is prime
2. sumOfPrimes: sum of all prime values
3. evenCount: count of even numbers
4. maxPrime: largest prime in array
5. checksum: (XOR of all primes) XOR nonce, mod 1000000

Return as JSON.
```

**Why It Verifies AI:**
- Must check 300-600 numbers for primality
- Requires accurate prime detection algorithm
- Must compute XOR checksum correctly
- Array is randomly generated each time
- Humans can't check hundreds of primes in 3 seconds

**Solution Structure:**
```json
{
  "primeIndices": [1, 7, 12, 45, ...],
  "sumOfPrimes": 28456,
  "evenCount": 223,
  "maxPrime": 1999,
  "checksum": 567890
}
```

---

### 3. Pattern Completion

Complete a mathematical sequence and extract specific values.

**Prompt Example:**
```
Challenge nonce: cafebabe

Starting values: [23, 67]
Recurrence relation: each term = (previous term * 4) + (term before that)
Total terms to generate: 22

Example:
- Term at index 0: 23
- Term at index 1: 67
- Term at index 2: (67 * 4) + 23 = 291
- Term at index 3: (291 * 4) + 67 = 1231
...

Return only values at PRIME indices (2, 3, 5, 7, 11, 13, 17, 19).

Calculate checksum: (sum of prime index terms) XOR 0xcafebabe, mod 1000000

Return format:
{
  "primeIndexTerms": [...],
  "checksum": <number>
}
```

**Why It Verifies AI:**
- Must correctly implement recurrence relation
- Must generate sequence up to 30 terms
- Must identify prime indices
- Must compute XOR checksum
- Requires mathematical precision

**Solution Structure:**
```json
{
  "primeIndexTerms": [291, 1231, 20195, 330067, ...],
  "checksum": 123456
}
```

---

### 4. Constraint Text

Generate words whose first letters spell out a target phrase.

**Prompt Example:**
```
Challenge nonce: 12345678

Write 14 words where the FIRST LETTER of each word spells out: RKWBFTNMJLDSQP

Rules:
- Exactly 14 words required
- First letter of word 1 must be "R"
- First letter of word 2 must be "K"
- And so on...
- Letters are case-insensitive
- Words must be separated by spaces

Return ONLY the text (no JSON, no quotes, just the words).

Example format: Word1 Word2 Word3 ...
```

**Why It Verifies AI:**
- Must generate valid words for each letter
- Phrase is deterministically derived from nonce
- Length varies (10-16 letters)
- Requires language knowledge
- Case-insensitive matching

**Solution Structure:**
```
Red Kite Walking Between Fields Through Narrow Mountain Jungle Lanes During Summer Quietly Passing
```

---

## Time Limits

All challenges have a **3-second TTL** (Time To Live).

### Timeline Breakdown

| Phase | Time |
|-------|------|
| API request latency | ~50-200ms |
| AI processing | ~500-2000ms |
| API response latency | ~50-200ms |
| **Total budget** | ~3000ms |

### Recommendations

1. **Start immediately** - Begin computation as soon as you receive the prompt
2. **Optimize parsing** - Parse the prompt efficiently
3. **Buffer time** - Aim to complete in 2.5 seconds
4. **Parallel processing** - For array challenges, parallelize prime checking
5. **Pre-warm connections** - Keep API connections warm to reduce latency

---

## Challenge Selection

Challenges are randomly selected when you call `/challenge`. The distribution is:

| Type | Probability |
|------|-------------|
| Structured JSON | 25% |
| Computational Array | 25% |
| Pattern Completion | 25% |
| Constraint Text | 25% |

Your AI agent should be capable of solving all four types.

---

## Solving Tips by Type

### Structured JSON
- Pre-compute a list of primes up to 31
- Generate calendar month by month
- Leap year check: `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`
- Count primes as you generate

### Computational Array
- Use an efficient prime checking algorithm
- For n < 2000, trial division is fast enough
- Track all statistics in a single pass
- XOR is associative, order doesn't matter

### Pattern Completion
- Parse seed values and multiplier from prompt
- Handle both `+` and `-` operations
- Pre-compute list of prime indices
- Watch for integer overflow in large sequences

### Constraint Text
- Any valid word starting with the correct letter works
- Simple words are fine: "Apple", "Ball", "Cat"
- Case doesn't matter for matching
- Word count must match phrase length exactly

---

## Testing Your Implementation

Use the demo at https://nothuman-demo.pages.dev to:
1. Get a challenge
2. View the prompt
3. Test your solution
4. See if it validates

Or use curl:
```bash
# Get challenge
curl -s -X POST https://api.humanproof.dev/challenge | jq '.'

# Check stats
curl -s https://api.humanproof.dev/stats | jq '.'
```
