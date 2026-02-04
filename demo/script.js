const API_BASE = 'https://api.humanproof.dev';

// DOM Elements
const getChallengeBtn = document.getElementById('get-challenge');
const timerEl = document.getElementById('timer');
const challengeContainer = document.getElementById('challenge-container');
const challengeIdEl = document.getElementById('challenge-id');
const challengePromptEl = document.getElementById('challenge-prompt');
const solutionContainer = document.getElementById('solution-container');
const solutionInput = document.getElementById('solution');
const submitBtn = document.getElementById('submit-solution');
const resultContainer = document.getElementById('result-container');
const resultEl = document.getElementById('result');

// State
let currentChallenge = null;
let timerInterval = null;
let expiresAt = null;

// Format time remaining
function formatTime(ms) {
    if (ms <= 0) return '0.00s';
    return (ms / 1000).toFixed(2) + 's';
}

// Update timer display
function updateTimer() {
    if (!expiresAt) return;

    const remaining = expiresAt - Date.now();

    if (remaining <= 0) {
        timerEl.textContent = 'EXPIRED';
        timerEl.classList.remove('active');
        timerEl.classList.add('expired');
        submitBtn.disabled = true;
        clearInterval(timerInterval);
        return;
    }

    timerEl.textContent = formatTime(remaining);
    timerEl.classList.add('active');
    timerEl.classList.remove('expired');
}

// Reset UI state
function resetUI() {
    challengeContainer.classList.add('hidden');
    solutionContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    timerEl.classList.add('hidden');
    timerEl.classList.remove('active', 'expired');
    solutionInput.value = '';
    resultEl.className = 'result';
    resultEl.innerHTML = '';

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    currentChallenge = null;
    expiresAt = null;
}

// Fetch new challenge
async function getChallenge() {
    resetUI();
    getChallengeBtn.disabled = true;
    getChallengeBtn.textContent = 'Loading...';

    try {
        const response = await fetch(`${API_BASE}/challenge`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        currentChallenge = data;

        // Calculate expiration time
        expiresAt = Date.now() + data.expiresIn;

        // Display challenge
        challengeIdEl.textContent = data.challengeId;
        challengePromptEl.textContent = data.prompt;
        challengeContainer.classList.remove('hidden');
        solutionContainer.classList.remove('hidden');
        timerEl.classList.remove('hidden');
        submitBtn.disabled = false;

        // Start timer
        updateTimer();
        timerInterval = setInterval(updateTimer, 50);

    } catch (error) {
        showResult(false, `Failed to fetch challenge: ${error.message}`);
    } finally {
        getChallengeBtn.disabled = false;
        getChallengeBtn.textContent = 'Get Challenge';
    }
}

// Submit solution
async function submitSolution() {
    if (!currentChallenge) return;

    const solution = solutionInput.value.trim();
    if (!solution) {
        showResult(false, 'Please enter a solution');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                challengeId: currentChallenge.challengeId,
                solution: solution,
            }),
        });

        const data = await response.json();

        if (data.success) {
            showResult(true, 'Challenge solved!', data.solveTimeMs, data.token);
        } else {
            showResult(false, data.error || 'Verification failed');
        }

    } catch (error) {
        showResult(false, `Request failed: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Solution';
    }
}

// Display result
function showResult(success, message, solveTimeMs = null, token = null) {
    resultContainer.classList.remove('hidden');
    resultEl.className = `result ${success ? 'success' : 'error'}`;

    let html = `<span>${message}</span>`;

    if (solveTimeMs !== null) {
        html += `<span class="solve-time">Solve time: ${solveTimeMs}ms</span>`;
    }

    if (token) {
        html += `<span class="token">Token: ${token}</span>`;
    }

    resultEl.innerHTML = html;
}

// Event listeners
getChallengeBtn.addEventListener('click', getChallenge);
submitBtn.addEventListener('click', submitSolution);

// Allow submit with Ctrl/Cmd + Enter
solutionInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        submitSolution();
    }
});

// ===== Code Tabs & Copy Functionality =====

// Tab switching
document.querySelectorAll('.code-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const lang = tab.dataset.lang;

        // Update tab active state
        document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update panel visibility
        document.querySelectorAll('.code-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.lang === lang);
        });
    });
});

// Copy to clipboard functionality
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const targetId = btn.dataset.target;
        const codeEl = document.getElementById(targetId);

        if (!codeEl) return;

        // Get plain text content (strip HTML tags)
        const code = codeEl.textContent;

        try {
            await navigator.clipboard.writeText(code);

            // Show "Copied!" feedback
            btn.classList.add('copied');

            // Reset after 2 seconds
            setTimeout(() => {
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
});
