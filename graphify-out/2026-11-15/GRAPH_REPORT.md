# Graph Report - HaruElec  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 152 nodes · 254 edges · 7 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `205d287f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- server.js
- app.js
- frontend_lifecycle.test.js
- audit_logs.test.js
- haruelec
- package.json
- build_questions.js

## God Nodes (most connected - your core abstractions)
1. `initEvents()` - 15 edges
2. `createServerHandler()` - 14 edges
3. `switchMode()` - 11 edges
4. `renderQuestion()` - 9 edges
5. `showToast()` - 9 edges
6. `haruelec` - 9 edges
7. `startServer()` - 8 edges
8. `init()` - 7 edges
9. `saveLocalState()` - 7 edges
10. `updateDashboardStats()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/audit_logs.test.js → server.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/leaderboard_rounds.test.js → server.js
- `runTests()` --calls--> `startServer()`  [EXTRACTED]
  tests/server.test.js → server.js

## Import Cycles
- None detected.

## Communities (7 total, 0 thin omitted)

### Community 0 - "server.js"
Cohesion: 0.09
Nodes (30): authenticate(), createServerHandler(), crypto, DATA_DIR, DB_FILE, { execSync }, fs, generateToken() (+22 more)

### Community 1 - "app.js"
Cohesion: 0.19
Nodes (31): checkDateTransition(), correct(), finish(), finishQuiz(), getKSTDateString(), handleAuthSubmit(), handleLogout(), handleSelectOption() (+23 more)

### Community 2 - "frontend_lifecycle.test.js"
Cohesion: 0.08
Nodes (23): dataDir, fs, path, questions, appJsCode, appJsPath, assert, distribution (+15 more)

### Community 3 - "audit_logs.test.js"
Cohesion: 0.17
Nodes (15): startServer(), assert, fs, http, path, request(), runTests(), assert (+7 more)

### Community 4 - "haruelec"
Cohesion: 0.12
Nodes (16): command, container_name, environment, image, networks, ports, restart, volumes (+8 more)

### Community 5 - "package.json"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, scripts, start (+2 more)

### Community 6 - "build_questions.js"
Cohesion: 0.18
Nodes (5): allRaw, finalQuestions, fs, outputPath, path

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `startServer()` connect `audit_logs.test.js` to `server.js`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `initEvents()` (e.g. with `finishQuiz()` and `handleAuthSubmit()`) actually correct?**
  _`initEvents()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0928030303030303 - nodes in this community are weakly interconnected._
- **Should `frontend_lifecycle.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07671957671957672 - nodes in this community are weakly interconnected._
- **Should `haruelec` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._