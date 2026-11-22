# Graph Report - HaruElec  (2026-11-23)

## Corpus Check
- 48 files · ~141,276 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: .apk 3, .ipa 3, (none) 1)

## Summary
- 573 nodes · 990 edges · 26 communities (20 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c1413e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- app.js
- build_questions.js
- audit_logs.test.js
- haruelec
- package.json
- init
- build_300_questions.js
- playTone
- build_250_questions.js
- ref_assert
- createServerHandler
- manifest.json
- public/manifest.json
- frontend_lifecycle.test.js
- questions.test.js
- ref_path
- security_and_bugfixes.test.js
- openPwaGuideModal
- generate_pwa_icons.sh
- public/sw.js
- sw.js
- atomicWriteJSON
- getDailyQuestions

## God Nodes (most connected - your core abstractions)
1. `initEvents()` - 48 edges
2. `showToast()` - 30 edges
3. `createServerHandler()` - 28 edges
4. `updateItemUI()` - 20 edges
5. `startServer()` - 20 edges
6. `saveLocalState()` - 19 edges
7. `init()` - 18 edges
8. `saveActiveQuizSession()` - 17 edges
9. `escapeHtml()` - 13 edges
10. `renderQuestion()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `escapeHtml()`  [EXTRACTED]
  tests/security_and_bugfixes.test.js → public/js/app.js
- `runTests()` --calls--> `selectUnsolvedFirstQuestions()`  [EXTRACTED]
  tests/unsolved_priority.test.js → public/js/app.js
- `runTests()` --calls--> `saveActiveQuizSession()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/security_and_bugfixes.test.js → server.js
- `runTests()` --calls--> `getKSTDateString()`  [EXTRACTED]
  tests/quiz_session_persistence.test.js → public/js/app.js

## Import Cycles
- None detected.

## Communities (26 total, 6 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.07
Nodes (24): ALLOWED_CORS_ORIGINS, authRateMap, crypto, DB_FILE, dbCache, { execSync, execFile }, fs, http (+16 more)

### Community 1 - "app.js"
Cohesion: 0.09
Nodes (68): apply5050ToCurrentOptions(), checkAppVersionUpdate(), checkDateTransition(), checkUnreadMessages(), checkWhatsNewPopup(), clearActiveQuizSession(), closeLuckyBox(), dismissWhatsNewPopup() (+60 more)

### Community 2 - "build_questions.js"
Cohesion: 0.18
Nodes (5): allRaw, finalQuestions, fs, outputPath, path

### Community 3 - "audit_logs.test.js"
Cohesion: 0.06
Nodes (38): startServer(), assert, fs, http, path, request(), runTests(), assert (+30 more)

### Community 4 - "haruelec"
Cohesion: 0.09
Nodes (22): command, container_name, environment, healthcheck, image, networks, ports, restart (+14 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, start (+2 more)

### Community 7 - "init"
Cohesion: 0.14
Nodes (17): getKSTDateString(), handleTogglePush(), init(), initPwa(), isStandalonePwa(), loadChapterRegistry(), loadLocalState(), loadQNetSchedule() (+9 more)

### Community 8 - "build_300_questions.js"
Cohesion: 0.17
Nodes (7): allQuestions, fs, levelNames, new50, normalized, path, stats

### Community 9 - "playTone"
Cohesion: 0.40
Nodes (5): correct(), finish(), messageChime(), playTone(), wrong()

### Community 10 - "build_250_questions.js"
Cohesion: 0.10
Nodes (12): allQuestions, fs, levelNames, outPath, path, sub1, sub2, sub3 (+4 more)

### Community 11 - "ref_assert"
Cohesion: 0.12
Nodes (22): awardShieldForConsecutivePerfect(), isServerVersionNewer(), processShieldDecision(), rollLuckyBoxReward(), useItem2xLogic(), useItem5050Logic(), useItemCloverLogic(), useItemHeartLogic() (+14 more)

### Community 12 - "createServerHandler"
Cohesion: 0.12
Nodes (16): authenticate(), checkAuthRateLimit(), createServerHandler(), escapeHtmlServer(), generateToken(), getChapterRegistry(), getClientIp(), getCorsOrigin() (+8 more)

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

### Community 18 - "ref_path"
Cohesion: 0.18
Nodes (8): dataDir, fs, path, questions, fs, levelNames, path, upgradedExisting

### Community 19 - "security_and_bugfixes.test.js"
Cohesion: 0.21
Nodes (11): mergeServerUserIntoState(), hashPassword(), hashPasswordLegacy(), verifyPassword(), assert, crypto, fs, http (+3 more)

### Community 24 - "atomicWriteJSON"
Cohesion: 0.25
Nodes (8): atomicWriteJSON(), getKSTTime(), loadLogs(), recordAccessLog(), saveDB(), saveLogs(), saveMessages(), savePushSubscriptions()

### Community 25 - "getDailyQuestions"
Cohesion: 0.67
Nodes (4): getDailyQuestions(), getDaySeed(), getLevelQuestions(), seededShuffle()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startServer()` connect `audit_logs.test.js` to `server.js`, `security_and_bugfixes.test.js`, `createServerHandler`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `initEvents()` (e.g. with `closeLuckyBox()` and `dismissWhatsNewPopup()`) actually correct?**
  _`initEvents()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Why does `escapeHtml()` connect `app.js` to `security_and_bugfixes.test.js`, `app.js`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09249786871270248 - nodes in this community are weakly interconnected._
- **Should `audit_logs.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05731523378582202 - nodes in this community are weakly interconnected._
- **Should `haruelec` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._