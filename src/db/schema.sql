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
