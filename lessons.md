# Lessons Learned

## Project-Specific Patterns

### Challenge TTL
- Challenge expiration is **3 seconds**, not minutes
- This is intentional for security - forces real-time AI processing
- Don't assume longer timeouts without asking

### TypeScript Imports in Routes
- `AppEnv` type is exported from `'../index'`, NOT `'../types'`
- Always check existing route files (challenge.ts, verify.ts) for import patterns before creating new routes
- Don't assume conventional paths - verify the actual codebase structure
