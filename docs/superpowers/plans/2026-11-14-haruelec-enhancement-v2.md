# HaruElec v2.0 - Haru Matchum Pattern Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate proven architectural standards from `haru.danminlove.com` (`Spelling`) to `elec.danminlove.com` (`HaruElec`): KST timezone standardization, mobile lifecycle midnight refresh, dynamic choice randomization, consecutive rounds progression, pure DB real-time leaderboard, and security audit logging with admin RBAC.

**Architecture:** Extend zero-dependency Node.js HTTP server (`server.js`) with audit logging (`data/access_logs.json`), leaderboard aggregation, and round-based seed generator. In frontend (`public/`), implement Fisher-Yates choice shuffler, lifecycle watchers (`visibilitychange`, `pageshow`, `focus`), consecutive round progression, and leaderboard/audit log modal UI.

**Tech Stack:** Node.js (v20 built-ins: `http`, `crypto`, `fs`, `path`), Vanilla JavaScript (ES6+), HTML5, CSS3 Glassmorphism, KaTeX CDN, Web Audio API, Docker (Portainer DS1019+).

**Spec:** Common Guidelines (`AGENTS.md`, `GEMINI.md`) Rules 4 through 8, and `Spelling` v2.0 Architecture.

## Global Constraints

- Zero external npm runtime dependencies: standard Node.js libraries only.
- Strict bidirectional Git sync with `https://github.com/mkotinet/HaruElec`.
- KST timezone (`Asia/Seoul`) must be strictly applied via `Intl.DateTimeFormat` (no raw UTC `toISOString().split('T')[0]`).
- Zero mock/dummy peer accounts in leaderboard.
- Admin access to audit logs restricted strictly to username `단민러브`.
- Dynamic choice randomization must maintain 100% answer correctness and equal ~25% distribution across choices 1, 2, 3, 4.

## Review Focus

1. **Answer index mapping during option shuffle**: ensure the original answer text is tracked and `q.answer` (1-based index) is correctly mapped to the new shuffled position.
2. **Deterministic round question generation**: ensure `round 1` produces identical questions as before, while `round 2, 3...` produces non-overlapping balanced questions across 5 subjects.
3. **Audit log rotation**: verify log file does not grow indefinitely and rotates to maximum 1,000 entries.
4. **RBAC security**: non-admin users attempting to access `/api/admin/logs` must receive 403 Forbidden.
5. **Mobile lifecycle rollover**: simulating a date change on `visibilitychange` must trigger safe return to home and refresh without throwing errors or breaking ongoing streaks.

---

### Task 1: Timezone(KST) & Audit Logging Core in Backend

**Files:**
- Modify: `server.js`
- Test: `tests/audit_logs.test.js`

- [ ] **Step 1: Write the failing audit logs test**
  Create `tests/audit_logs.test.js` testing:
  - `getKSTDateString()` returns valid KST YYYY-MM-DD
  - `recordAccessLog` creates entries in `data/access_logs.json`
  - `/api/auth/register`, `/api/auth/login`, `/api/user/sync` generate log records
  - `/api/user/logs` returns recent 30 logs for authenticated user
  - `/api/admin/logs` returns 403 Forbidden for normal user, and 200 OK with logs for `단민러브`

- [ ] **Step 2: Run test to confirm it fails**
  Run `node tests/audit_logs.test.js` and verify failure.

- [ ] **Step 3: Implement KST helpers and audit logging in `server.js`**
  - Implement `getKSTTime()`, `getKSTDateString(dateObj)`
  - Implement `getClientIp(req)`
  - Implement `loadLogs()`, `saveLogs(logs)` (max 1000 entries rotation)
  - Implement `recordAccessLog(username, action, ip, userAgent, details)`
  - In `/api/auth/register`, record `REGISTER`
  - In `/api/auth/login`, record `LOGIN_SUCCESS` or `LOGIN_FAIL`
  - In `/api/user/sync`, record `DATA_SYNC` or `ROUND_CLEAR`
  - Implement `GET /api/user/logs`
  - Implement `GET /api/admin/logs` (check `auth.username === '단민러브'`)

- [ ] **Step 4: Run test to confirm it passes**
  Run `node tests/audit_logs.test.js` and verify 100% pass.

- [ ] **Step 5: Commit Task 1**
  `git add server.js tests/audit_logs.test.js && git commit -m "feat(server): add KST timezone standardization and audit logging with admin RBAC"`

---

### Task 2: Consecutive Rounds & Real-time Leaderboard in Backend

**Files:**
- Modify: `server.js`
- Test: `tests/leaderboard_rounds.test.js`

- [ ] **Step 1: Write the failing leaderboard and rounds test**
  Create `tests/leaderboard_rounds.test.js` testing:
  - `getDailyQuestions(dateStr, round)` produces balanced 10 questions (2 per subject) for round 1, 2, 3
  - Round 1 and Round 2 on same date produce distinct question sets
  - `GET /api/questions/daily?date=YYYY-MM-DD&round=2` returns round 2 questions
  - `GET /api/leaderboard` returns actual DB users sorted by `totalPoints` descending, containing `streak`, `todayScore`, `maxRoundToday`
  - No dummy/mock users present in leaderboard

- [ ] **Step 2: Run test to confirm it fails**
  Run `node tests/leaderboard_rounds.test.js` and verify failure.

- [ ] **Step 3: Implement round progression and leaderboard in `server.js`**
  - Update `getDailyQuestions(dateStr, round = 1)` with round seed offset `(seed + (round - 1) * 31 + sId * 1000)`
  - Update `/api/questions/daily` to parse `round` query parameter
  - Update user schema in register/sync to support `totalPoints`, `todayScore`, `maxRoundToday`
  - Implement `GET /api/leaderboard` endpoint
  - Update `/api/user/sync` to handle `action === 'ROUND_CLEAR'` and bonus points

- [ ] **Step 4: Run test to confirm it passes**
  Run `node tests/leaderboard_rounds.test.js` and verify 100% pass.

- [ ] **Step 5: Commit Task 2**
  `git add server.js tests/leaderboard_rounds.test.js && git commit -m "feat(server): implement consecutive daily rounds and real-time leaderboard API"`

---

### Task 3: Dynamic Choice Randomization & Mobile Lifecycle in Frontend

**Files:**
- Modify: `public/js/app.js`
- Test: `tests/frontend_lifecycle.test.js`

- [ ] **Step 1: Write the failing frontend logic test**
  Create `tests/frontend_lifecycle.test.js` testing:
  - `shuffleQuestionOptions(q)` function:
    - 4 choices are randomly shuffled
    - original answer text is preserved and `answer` index is correctly updated
    - over 1,000 runs, distribution of `answer` across 1, 2, 3, 4 is roughly ~25% each
  - `checkDateTransition(overrideDateStr)` logic resets active round and returns to daily view

- [ ] **Step 2: Run test to confirm it fails**
  Run `node tests/frontend_lifecycle.test.js` and verify failure.

- [ ] **Step 3: Implement choice randomization and lifecycle in `public/js/app.js`**
  - Add `getKSTDateString()` in client
  - Implement `shuffleQuestionOptions(q)` using Fisher-Yates algorithm
  - Apply `shuffleQuestionOptions` when rendering questions in all modes (`daily`, `practice`, `kec`, `search`, `wrong`)
  - Implement `checkDateTransition(overrideDateStr)`
  - Bind lifecycle listeners: `visibilitychange`, `pageshow`, `focus`, and 60-second `setInterval`

- [ ] **Step 4: Run test to confirm it passes**
  Run `node tests/frontend_lifecycle.test.js` and verify 100% pass.

- [ ] **Step 5: Commit Task 3**
  `git add public/js/app.js tests/frontend_lifecycle.test.js && git commit -m "feat(client): implement dynamic option shuffle and mobile lifecycle date transition"`

---

### Task 4: UI Components for Consecutive Rounds, Leaderboard, Audit Logs & Admin

**Files:**
- Modify: `public/index.html`
- Modify: `public/css/style.css`
- Modify: `public/js/app.js`

- [ ] **Step 1: Add Leaderboard, Round Challenge, and Audit UI to `index.html`**
  - Add `[🏆 명예의 전당]` mode tab in `<nav class="mode-tabs">`
  - Add Round badge in quiz header (`<span class="round-badge" id="quizRoundBadge">라운드 1</span>`)
  - Add `<section class="leaderboard-container glass hidden" id="leaderboardSection">`
  - In Result Screen, add Next Round button (`<button class="btn btn-accent btn-lg hidden" id="nextRoundBtn">🎉 100점 만점 통과! 라운드 2 (새 10문제) 도전하기 🔥</button>`)
  - In Stats Section, add `[내 접속 이력]` list container
  - Add Admin Audit Modal for `단민러브` (`#adminAuditModal`) with log table and filter

- [ ] **Step 2: Add CSS styling in `style.css`**
  - Leaderboard table, rank medals (🥇, 🥈, 🥉), round badges
  - Next round challenge button glowing styling
  - Audit log table, status badges (`LOGIN_SUCCESS`, `REGISTER`, `ROUND_CLEAR`)
  - Admin audit modal styling

- [ ] **Step 3: Wire frontend logic in `app.js`**
  - Track `state.currentRound = 1`
  - In `finishQuiz()`, check if `score === 100` in daily mode:
    - Show `nextRoundBtn`
    - Award +50P bonus points
    - Sync `action: "ROUND_CLEAR"` to `/api/user/sync`
  - Add `loadLeaderboard()` fetching `/api/leaderboard`
  - Add `loadUserLogs()` fetching `/api/user/logs`
  - Add `loadAdminLogs()` fetching `/api/admin/logs` if `state.user.username === '단민러브'`
  - Show "🛡️ 관리자 감사 로그" button in header/menu if user is `단민러브`

- [ ] **Step 4: Verify full test suite passes**
  Run `npm test` and all tests pass.

- [ ] **Step 5: Commit Task 4**
  `git add public/ && git commit -m "feat(ui): add leaderboard view, consecutive round challenge, and audit log modals"`

---

### Task 5: Integration Verification, Container Restart, Documentation & Git Sync

**Files:**
- Modify: `package.json` (add new tests to test script)
- Modify: `기술레포트.md`
- Modify: `제작히스토리.md`
- Modify: `README.md`

- [ ] **Step 1: Run comprehensive local test suite**
  Update `package.json` test script to run all test files:
  `node tests/questions.test.js && node tests/server.test.js && node tests/audit_logs.test.js && node tests/leaderboard_rounds.test.js && node tests/frontend_lifecycle.test.js`
  Run `npm test` and ensure all tests pass cleanly.

- [ ] **Step 2: Push all commits to GitHub remote repo**
  Run `git push origin main` and confirm clean push.

- [ ] **Step 3: Restart Portainer container on Synology DS1019+**
  Use `portainer` MCP tool to restart container `f88fe705a668` (ID: 3, `haruelec`).

- [ ] **Step 4: Verify live endpoints on `https://elec.danminlove.com`**
  - `curl -s https://elec.danminlove.com/api/health`
  - `curl -s https://elec.danminlove.com/api/leaderboard`
  - `curl -s "https://elec.danminlove.com/api/questions/daily?round=2"`
  - Verify SSL certificate and 200 OK.

- [ ] **Step 5: Update documentation & final push**
  - Update `기술레포트.md` with v2.0 architecture, RCA, and audit/round verification.
  - Update `제작히스토리.md` with timeline and deliverables.
  - Update `README.md` with new features.
  - Push final docs commit to `origin main`.
