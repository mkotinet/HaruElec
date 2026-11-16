# Graph Report - HaruElec  (2026-11-16)

## Corpus Check
- 37 files · ~101,688 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 392 nodes · 691 edges · 13 communities
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc7871c2`
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
- build_250_questions.js
- lucky_box.test.js
- selectUnsolvedFirstQuestions

## God Nodes (most connected - your core abstractions)
1. `initEvents()` - 36 edges
2. `showToast()` - 20 edges
3. `updateItemUI()` - 19 edges
4. `saveLocalState()` - 18 edges
5. `saveActiveQuizSession()` - 17 edges
6. `createServerHandler()` - 16 edges
7. `startServer()` - 14 edges
8. `init()` - 13 edges
9. `renderQuestion()` - 12 edges
10. `switchMode()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `selectUnsolvedFirstQuestions()`  [EXTRACTED]
  tests/unsolved_priority.test.js → public/js/app.js
- `runTests()` --calls--> `saveActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `getKSTDateString()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `restoreActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `awardShieldForConsecutivePerfect()`  [EXTRACTED]
  tests/gamification_shield.test.js → public/js/app.js

## Import Cycles
- None detected.

## Communities (13 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.08
Nodes (33): authenticate(), createServerHandler(), crypto, DB_FILE, { execSync }, fs, generateToken(), getClientIp() (+25 more)

### Community 1 - "app.js"
Cohesion: 0.18
Nodes (41): apply5050ToCurrentOptions(), checkDateTransition(), clearActiveQuizSession(), finishQuiz(), handleAuthSubmit(), handleLogout(), handleSelectOption(), hideActiveItemBanner() (+33 more)

### Community 2 - "frontend_lifecycle.test.js"
Cohesion: 0.05
Nodes (33): dataDir, fs, path, questions, allRaw, finalQuestions, fs, outputPath (+25 more)

### Community 3 - "audit_logs.test.js"
Cohesion: 0.08
Nodes (30): startServer(), assert, fs, http, path, request(), runTests(), assert (+22 more)

### Community 4 - "haruelec"
Cohesion: 0.12
Nodes (16): command, container_name, environment, image, networks, ports, restart, volumes (+8 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, start (+2 more)

### Community 6 - "app.js"
Cohesion: 0.02
Nodes (5): closeLuckyBox(), loadAdminLogs(), loadUserLogs(), recordQuestionSolved(), renderStatsView()

### Community 7 - "ref_assert"
Cohesion: 0.17
Nodes (14): checkAppVersionUpdate(), getKSTDateString(), init(), isServerVersionNewer(), loadLocalState(), loadQNetSchedule(), restoreActiveQuizSession(), unlockAudio() (+6 more)

### Community 8 - "gamification_shield.test.js"
Cohesion: 0.22
Nodes (15): awardShieldForConsecutivePerfect(), processShieldDecision(), useItem2xLogic(), useItem5050Logic(), useItemCloverLogic(), useItemHeartLogic(), useItemHintLogic(), useItemMagnetLogic() (+7 more)

### Community 9 - "playTone"
Cohesion: 0.50
Nodes (4): correct(), finish(), playTone(), wrong()

### Community 10 - "build_250_questions.js"
Cohesion: 0.09
Nodes (12): allQuestions, fs, levelNames, outPath, path, sub1, sub2, sub3 (+4 more)

### Community 11 - "lucky_box.test.js"
Cohesion: 0.40
Nodes (4): rollLuckyBoxReward(), assert, mockStorage, runTests()

### Community 12 - "selectUnsolvedFirstQuestions"
Cohesion: 0.50
Nodes (4): selectUnsolvedFirstQuestions(), shuffleArray(), assert, runTests()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startServer()` connect `audit_logs.test.js` to `server.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `initEvents()` (e.g. with `closeLuckyBox()` and `finishQuiz()`) actually correct?**
  _`initEvents()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08250355618776671 - nodes in this community are weakly interconnected._
- **Why does `saveActiveQuizSession()` connect `app.js` to `app.js`, `ref_assert`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `frontend_lifecycle.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.048484848484848485 - nodes in this community are weakly interconnected._
- **Should `audit_logs.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07926829268292683 - nodes in this community are weakly interconnected._
- **Should `haruelec` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._