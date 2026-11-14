# HaruElec v2.1.0 High-End Architectural Enhancement Plan
(Adopting haru.danminlove.com / Spelling Proven Patterns & Common Guidelines)

- **Date**: 2026-11-15
- **Reference**: `/Users/kotinet/Documents/Spelling/기술레포트.md`, `/Users/kotinet/Documents/Spelling/제작히스토리.md`
- **Target**: `/Users/kotinet/Documents/HaruElec` (`https://elec.danminlove.com`)
- **Key Guidelines**: Rules 1~12 (Bidirectional Git Sync, Documentation, KST standard, Mobile Lifecycle, Pure DB Leaderboard, Audit Logging RBAC, Option Randomization, Persistent Auth Session, Gamification & Shield Cap 2, Graphify, Sequential Skills)

---

## 1. Overview & Objectives

Following the latest production-proven architectural achievements of `haru.danminlove.com` (Spelling v2.0 ~ v2.6.1), we will upgrade `elec.danminlove.com` (HaruElec) to v2.1.0 with:
1. **Rule 9: Persistent Auth Session**: Strict 401 isolation, network error tolerance, Docker `/app/data` volume detection & auto-bootstrap.
2. **Rule 10 & Gamification**:
   - Shield (🛡️) System: 2-in-a-row perfect 10/10 award, max 2 shields cap (`Math.min(2, ...)`), and strategic user decision box (`#shieldDecisionBox`) on round failure (use shield vs save shield).
   - 3-in-a-row perfect bonus (+300P).
   - 3 Electric Quiz Chance Items: `⚡ 50:50 전력 차단` (disable 2 wrong choices), `💖 절연 보호 (하트)` (1 wrong choice forgiveness & retry), `🚀 2배 부스터` (double round points).
   - Game Guide Modal (`#gameGuideModal`) with rules and item guide.
3. **Unsolved-First Question Selection Engine (`selectUnsolvedFirstQuestions`)**:
   - Track solved question IDs in `localStorage` and sync to server `/api/user/sync`.
   - Prioritize unseen questions over seen questions, eliminating repetitive Q1~Q10 problem.
   - Dynamic 10-question Fisher-Yates shuffle every time.
4. **Mobile Version Check & Auto-Reload (`checkAppVersionUpdate`)**:
   - `version.json` and `GET /api/version` with strict `no-store` cache headers.
   - 5 browser lifecycle hooks (`visibilitychange`, `pageshow`, `focus`, `online`, 3min timer) checking for newer server version, saving active quiz session, purging CacheStorage, and hard-refreshing with reload loop guard.
   - Header manual reload button (`#btnReloadPage` 🔄).
5. **Mobile Multitasking Active Quiz Session Persistence (`saveActiveQuizSession` / `restoreActiveQuizSession`)**:
   - Real-time serialization of quiz state to `localStorage` (`haruelec_active_quiz_session`).
   - Seamless resumption when returning from KakaoTalk/browser reload with `[⚡ 풀던 10문제 이어하기]` banner.
6. **Web Audio API First-Touch Unlock (`unlockAudio`)**:
   - Overcome mobile Safari/Chrome Autoplay Policy via synchronous user-gesture AudioContext resume.
   - High-precision hardware clock audio synthesis for correct/wrong sounds.
7. **Mobile Screen Layout Optimization**:
   - `white-space: nowrap; flex-shrink: 0;` for header logos to prevent vertical tower layout breakage on mobile (360~390px).

---

## 2. Implementation Tasks

### Task 1: Persistent Auth Session (Rule 9) & Version Endpoint in Backend
- Modify: `server.js`
- Create: `version.json`
- Test: `tests/persistent_auth.test.js`
- Steps:
  1. Write failing test `tests/persistent_auth.test.js` validating `/app/data` bootstrap fallback, `GET /api/version` no-store cache headers, and `/api/user/sync` accepting `solvedQuestionIds`, `shieldCount`, `items`.
  2. Implement in `server.js`.
  3. Verify test passes and commit.

### Task 2: Unsolved-First Question Selection Engine & Mobile Quiz Session Persistence
- Modify: `public/js/app.js`
- Test: `tests/unsolved_priority.test.js`
- Test: `tests/quiz_session_persistence.test.js`
- Steps:
  1. Write failing test `tests/unsolved_priority.test.js` validating `selectUnsolvedFirstQuestions` behavior.
  2. Write failing test `tests/quiz_session_persistence.test.js` validating `saveActiveQuizSession` and `restoreActiveQuizSession`.
  3. Implement in `public/js/app.js`.
  4. Verify tests pass and commit.

### Task 3: Gamification System (Shield Cap 2 & Decision Modal, 3-in-a-row Bonus, Electric Items)
- Modify: `public/js/app.js`
- Test: `tests/gamification_shield.test.js`
- Steps:
  1. Write failing test `tests/gamification_shield.test.js` validating shield cap 2, shield decision handling, 3-in-a-row +300P bonus, and 3 electric items.
  2. Implement gamification logic in `public/js/app.js`.
  3. Verify tests pass and commit.

### Task 4: Auto Version Check, Web Audio First-Touch Unlock & UI Components
- Modify: `public/index.html`
- Modify: `public/css/style.css`
- Modify: `public/js/app.js`
- Test: `tests/version_check.test.js`
- Steps:
  1. Add UI components to `public/index.html` (Shield badge, reload button, game guide button, resume quiz banner, quiz item bar, active banner, shield decision box, game guide modal).
  2. Add CSS styles to `public/css/style.css`.
  3. Wire `checkAppVersionUpdate()`, `unlockAudio()`, and UI event listeners in `public/js/app.js`.
  4. Verify test passes and commit.

### Task 5: Full Integration Verification, Portainer Restart, Documentation & Git Sync
- Modify: `package.json`
- Modify: `기술레포트.md`
- Modify: `제작히스토리.md`
- Modify: `README.md`
- Modify: `ledger.md`
- Steps:
  1. Update `package.json` test script to run all 9 test suites.
  2. Run `npm test` and ensure 100% pass.
  3. Push commits to GitHub `origin main`.
  4. Restart Portainer container `haruelec` on Synology NAS and verify live endpoints on `https://elec.danminlove.com`.
  5. Update `기술레포트.md`, `제작히스토리.md`, `README.md`, update AST graph with `graphify update .`, and commit/push final documentation.
