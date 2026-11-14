# Graph Report - HaruElec  (2026-11-15)

## Corpus Check
- 23 files · ~56,828 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 285 nodes · 495 edges · 10 communities
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `74e7a38e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- app.js
- frontend_lifecycle.test.js
- audit_logs.test.js
- haruelec
- package.json
- app.js
- ref_assert
- gamification_shield.test.js
- playTone

## God Nodes (most connected - your core abstractions)
1. `initEvents()` - 28 edges
2. `showToast()` - 15 edges
3. `createServerHandler()` - 14 edges
4. `updateItemUI()` - 13 edges
5. `init()` - 12 edges
6. `saveActiveQuizSession()` - 12 edges
7. `finishQuiz()` - 11 edges
8. `saveLocalState()` - 11 edges
9. `switchMode()` - 11 edges
10. `startServer()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `saveActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `selectUnsolvedFirstQuestions()`  [EXTRACTED]
  tests/unsolved_priority.test.js → public/js/app.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/audit_logs.test.js → server.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/leaderboard_rounds.test.js → server.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/persistent_auth.test.js → server.js

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.09
Nodes (30): authenticate(), createServerHandler(), crypto, DB_FILE, { execSync }, fs, generateToken(), getClientIp() (+22 more)

### Community 1 - "app.js"
Cohesion: 0.19
Nodes (34): apply5050ToCurrentOptions(), checkAppVersionUpdate(), checkDateTransition(), clearActiveQuizSession(), finishQuiz(), handleAuthSubmit(), handleLogout(), handleSelectOption() (+26 more)

### Community 2 - "frontend_lifecycle.test.js"
Cohesion: 0.06
Nodes (28): dataDir, fs, path, questions, allRaw, finalQuestions, fs, outputPath (+20 more)

### Community 3 - "audit_logs.test.js"
Cohesion: 0.12
Nodes (21): startServer(), assert, fs, http, path, request(), runTests(), assert (+13 more)

### Community 4 - "haruelec"
Cohesion: 0.12
Nodes (16): command, container_name, environment, image, networks, ports, restart, volumes (+8 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, start (+2 more)

### Community 6 - "app.js"
Cohesion: 0.02
Nodes (7): loadAdminLogs(), loadLocalState(), loadUserLogs(), recordQuestionSolved(), renderMath(), renderStatsView(), unlockAudio()

### Community 7 - "ref_assert"
Cohesion: 0.15
Nodes (13): getKSTDateString(), isServerVersionNewer(), restoreActiveQuizSession(), selectUnsolvedFirstQuestions(), shuffleArray(), updateResumeQuizBanner(), assert, mockStorage (+5 more)

### Community 8 - "gamification_shield.test.js"
Cohesion: 0.36
Nodes (8): awardShieldForConsecutivePerfect(), processShieldDecision(), useItem2xLogic(), useItem5050Logic(), useItemHeartLogic(), assert, mockStorage, runTests()

### Community 9 - "playTone"
Cohesion: 0.50
Nodes (4): correct(), finish(), playTone(), wrong()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startServer()` connect `audit_logs.test.js` to `server.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `initEvents()` (e.g. with `finishQuiz()` and `handleAuthSubmit()`) actually correct?**
  _`initEvents()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08912655971479501 - nodes in this community are weakly interconnected._
- **Why does `saveActiveQuizSession()` connect `app.js` to `app.js`, `ref_assert`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `frontend_lifecycle.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0553306342780027 - nodes in this community are weakly interconnected._
- **Why does `selectUnsolvedFirstQuestions()` connect `ref_assert` to `app.js`, `app.js`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Should `audit_logs.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._