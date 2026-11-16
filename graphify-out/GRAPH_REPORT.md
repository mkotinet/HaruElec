# Graph Report - HaruElec  (2026-11-16)

## Corpus Check
- 48 files · ~110,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 1, .css 1, .apk 1)

## Summary
- 499 nodes · 844 edges · 24 communities (19 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c01ab0b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- app.js
- build_questions.js
- audit_logs.test.js
- haruelec
- package.json
- app.js
- checkAppVersionUpdate
- gamification_shield.test.js
- playTone
- build_250_questions.js
- lucky_box.test.js
- selectUnsolvedFirstQuestions
- manifest.json
- public/manifest.json
- frontend_lifecycle.test.js
- questions.test.js
- ref_fs
- ref_path
- openPwaGuideModal
- generate_pwa_icons.sh

## God Nodes (most connected - your core abstractions)
1. `initEvents()` - 46 edges
2. `showToast()` - 27 edges
3. `createServerHandler()` - 21 edges
4. `updateItemUI()` - 19 edges
5. `saveLocalState()` - 18 edges
6. `startServer()` - 18 edges
7. `saveActiveQuizSession()` - 17 edges
8. `init()` - 16 edges
9. `renderQuestion()` - 12 edges
10. `switchMode()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `selectUnsolvedFirstQuestions()`  [EXTRACTED]
  tests/unsolved_priority.test.js → public/js/app.js
- `runTests()` --calls--> `getKSTDateString()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `saveActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `restoreActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `awardShieldForConsecutivePerfect()`  [EXTRACTED]
  tests/gamification_shield.test.js → public/js/app.js

## Import Cycles
- None detected.

## Communities (24 total, 5 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.07
Nodes (41): authenticate(), createServerHandler(), crypto, DB_FILE, { execSync }, fs, generateToken(), getClientIp() (+33 more)

### Community 1 - "app.js"
Cohesion: 0.10
Nodes (63): apply5050ToCurrentOptions(), checkDateTransition(), checkUnreadMessages(), clearActiveQuizSession(), finishQuiz(), getKSTDateString(), handleAuthSubmit(), handleLogout() (+55 more)

### Community 2 - "build_questions.js"
Cohesion: 0.18
Nodes (5): allRaw, finalQuestions, fs, outputPath, path

### Community 3 - "audit_logs.test.js"
Cohesion: 0.07
Nodes (38): startServer(), assert, fs, http, path, request(), runTests(), assert (+30 more)

### Community 4 - "haruelec"
Cohesion: 0.12
Nodes (16): command, container_name, environment, image, networks, ports, restart, volumes (+8 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, start (+2 more)

### Community 6 - "app.js"
Cohesion: 0.01
Nodes (5): closeLuckyBox(), loadAdminLogs(), loadUserLogs(), recordQuestionSolved(), renderStatsView()

### Community 7 - "checkAppVersionUpdate"
Cohesion: 0.50
Nodes (4): checkAppVersionUpdate(), isServerVersionNewer(), assert, runTests()

### Community 8 - "gamification_shield.test.js"
Cohesion: 0.22
Nodes (15): awardShieldForConsecutivePerfect(), processShieldDecision(), useItem2xLogic(), useItem5050Logic(), useItemCloverLogic(), useItemHeartLogic(), useItemHintLogic(), useItemMagnetLogic() (+7 more)

### Community 9 - "playTone"
Cohesion: 0.40
Nodes (5): correct(), finish(), messageChime(), playTone(), wrong()

### Community 10 - "build_250_questions.js"
Cohesion: 0.10
Nodes (12): allQuestions, fs, levelNames, outPath, path, sub1, sub2, sub3 (+4 more)

### Community 11 - "lucky_box.test.js"
Cohesion: 0.40
Nodes (4): rollLuckyBoxReward(), assert, mockStorage, runTests()

### Community 12 - "selectUnsolvedFirstQuestions"
Cohesion: 0.50
Nodes (4): selectUnsolvedFirstQuestions(), shuffleArray(), assert, runTests()

### Community 13 - "manifest.json"
Cohesion: 0.14
Nodes (13): background_color, categories, description, display, display_override, icons, id, name (+5 more)

### Community 14 - "public/manifest.json"
Cohesion: 0.14
Nodes (13): background_color, categories, description, display, display_override, icons, id, name (+5 more)

### Community 15 - "frontend_lifecycle.test.js"
Cohesion: 0.18
Nodes (10): appJsCode, appJsPath, assert, distribution, fn, fs, kstDate, path (+2 more)

### Community 16 - "questions.test.js"
Cohesion: 0.18
Nodes (10): assert, fs, ids, levelCounts, path, questions, questionsPath, raw (+2 more)

### Community 18 - "ref_fs"
Cohesion: 0.25
Nodes (4): fs, levelNames, path, upgradedExisting

### Community 19 - "ref_path"
Cohesion: 0.33
Nodes (4): dataDir, fs, path, questions

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startServer()` connect `audit_logs.test.js` to `server.js`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `initEvents()` (e.g. with `closeLuckyBox()` and `finishQuiz()`) actually correct?**
  _`initEvents()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06859903381642513 - nodes in this community are weakly interconnected._
- **Why does `saveActiveQuizSession()` connect `app.js` to `app.js`, `checkAppVersionUpdate`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10168650793650794 - nodes in this community are weakly interconnected._
- **Should `audit_logs.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06509803921568627 - nodes in this community are weakly interconnected._
- **Should `haruelec` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._