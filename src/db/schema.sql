-- Challenges table for storing verification challenges
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    nonce TEXT NOT NULL,
    parameters TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    solved INTEGER DEFAULT 0,
    solved_at INTEGER,
    solve_time_ms INTEGER
);

-- Index for cleanup of expired challenges
CREATE INDEX IF NOT EXISTS idx_challenges_expires_at ON challenges(expires_at);

-- Index for finding unsolved challenges
CREATE INDEX IF NOT EXISTS idx_challenges_solved ON challenges(solved);

-- Rate limits table for tracking API usage
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (ip, endpoint, window_start)
);

-- Index for cleanup of old rate limit entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
