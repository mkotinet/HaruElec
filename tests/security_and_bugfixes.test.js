const assert = require("assert");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { startServer, hashPassword, verifyPassword } = require("../server.js");
const { escapeHtml, mergeServerUserIntoState } = require("../public/js/app.js");

const TEST_PORT = 8991;
let serverInstance = null;

function request(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port: TEST_PORT,
      path: reqPath,
      method: options.method || "GET",
      headers: options.headers || {}
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🛡️ Running v3.3.0 Security Hardening & Bugfix Regression Suite...");
  serverInstance = await startServer(TEST_PORT);

  try {
    // 1. scrypt Password Hashing & Legacy SHA-256 Transparent Upgrade
    console.log("1. Testing scrypt password hashing & legacy SHA-256 verification...");
    const h1 = hashPassword("SecretPass!2026");
    const h2 = hashPassword("SecretPass!2026");
    assert.ok(h1.startsWith("scrypt:"), "New hashes must use scrypt");
    assert.notStrictEqual(h1, h2, "Per-user random salt must produce unique hashes");
    assert.strictEqual(verifyPassword("SecretPass!2026", h1).valid, true);
    assert.strictEqual(verifyPassword("WrongPass", h1).valid, false);
    const legacyHash = crypto.createHash("sha256").update("OldPass123haru_elec_salt_2026").digest("hex");
    const legacyCheck = verifyPassword("OldPass123", legacyHash);
    assert.strictEqual(legacyCheck.valid, true);
    assert.strictEqual(legacyCheck.needsUpgrade, true);

    // 2. Unauthenticated POST /api/sync/github must be blocked with 403
    console.log("2. Testing POST /api/sync/github admin RBAC enforcement...");
    const unauthGit = await request("/api/sync/github", { method: "POST" });
    assert.strictEqual(unauthGit.status, 403, "Unauthenticated /api/sync/github must return 403");

    // 3. Security Headers & Strict CORS (no wildcard '*')
    console.log("3. Testing Security Headers & CORS allowlist...");
    const healthRes = await request("/api/health", {
      headers: { Origin: "https://evil.example.com" }
    });
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.headers["x-content-type-options"], "nosniff");
    assert.strictEqual(healthRes.headers["x-frame-options"], "SAMEORIGIN");
    assert.strictEqual(healthRes.headers["referrer-policy"], "strict-origin-when-cross-origin");
    assert.strictEqual(healthRes.headers["access-control-allow-origin"], undefined, "Untrusted origin must not receive ACAO header");

    const allowedCors = await request("/api/health", {
      headers: { Origin: "https://elec.danminlove.com" }
    });
    assert.strictEqual(allowedCors.headers["access-control-allow-origin"], "https://elec.danminlove.com");

    // 4. Manifest Cache-Control (Rule 15.1 no-store) & Releases Extension Allowlist
    console.log("4. Testing manifest no-store header & /releases/ extension allowlist...");
    const manifestRes = await request("/manifest.json");
    assert.strictEqual(manifestRes.status, 200);
    assert.ok(manifestRes.headers["cache-control"].includes("no-store"), "manifest.json must include no-store");
    assert.strictEqual(manifestRes.body.id, "/?pwa=1", "manifest.json id must be /?pwa=1");

    const badRelease = await request("/releases/server.js");
    assert.strictEqual(badRelease.status, 403, "Non-APK/IPA file under /releases/ must return 403");
    const blockedUsers = await request("/data/users.json");
    assert.strictEqual(blockedUsers.status, 403, "/data/users.json must return 403");
    const blockedGit = await request("/.git/config");
    assert.strictEqual(blockedGit.status, 403, "/.git/config must return 403");
    const blockedServer = await request("/server.js");
    assert.strictEqual(blockedServer.status, 403, "/server.js must return 403");

    // 5. Payload Size Limit (1MB -> 413)
    console.log("5. Testing 1MB JSON payload limit (413 Payload Too Large)...");
    const hugePayload = JSON.stringify({ data: "A".repeat(1100 * 1024) });
    try {
      const hugeRes = await request("/api/questions/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(hugePayload) },
        body: hugePayload
      });
      assert.strictEqual(hugeRes.status, 413);
    } catch (e) {
      // Connection reset by req.destroy() on oversized body is also valid DoS rejection
      assert.ok(e.code === "ECONNRESET" || e.code === "EPIPE", "Oversized body must be rejected");
    }

    // 6. Lightweight POST /api/questions/by-ids
    console.log("6. Testing POST /api/questions/by-ids for Wrong Notes...");
    const byIds = await request("/api/questions/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { ids: [1, 22, 178] }
    });
    assert.strictEqual(byIds.status, 200);
    assert.strictEqual(byIds.body.total, 3);

    // 7. Unauthenticated /api/push/test must return 401 & Query-string token must not auth /api/messages/inbox
    console.log("7. Testing /api/push/test auth & disabling ?token= query auth...");
    const unauthPush = await request("/api/push/test", { method: "POST" });
    assert.strictEqual(unauthPush.status, 401);

    const uA = "sec_userA_" + Date.now();
    const uB = "sec_userB_" + Date.now();
    const regA = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.99.1" },
      body: { username: uA, password: "password123", nickname: "보안테스터A" }
    });
    const regB = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "10.0.99.2" },
      body: { username: uB, password: "password123", nickname: "보안테스터B" }
    });
    assert.strictEqual(regA.status, 200);
    assert.strictEqual(regB.status, 200);
    const tokenA = regA.body.token;

    const queryTokenRes = await request(`/api/messages/inbox?token=${tokenA}`);
    assert.strictEqual(queryTokenRes.status, 401, "Query-string ?token= must be rejected");

    // 8. Broadcast "전체 수험생" message must succeed (no longer 404!) & GET /api/users/recipients
    console.log("8. Testing broadcast message ('전체 수험생') & /api/users/recipients...");
    const recRes = await request("/api/users/recipients", {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(recRes.status, 200);
    assert.ok(recRes.body.recipients.some(r => r.username === uB));

    const broadcastRes = await request("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: { toUsername: "전체 수험생", content: "모두 동차합격 파이팅! ⚡" }
    });
    assert.strictEqual(broadcastRes.status, 201, "Broadcast to 전체 수험생 must succeed with 201");
    assert.ok(broadcastRes.body.count >= 1);

    // 9. Rate Limiting on /api/auth/login (returns 429 after 20 rapid attempts from same IP)
    console.log("9. Testing IP Rate Limiting on /api/auth/login...");
    let got429 = false;
    for (let i = 0; i < 22; i++) {
      const r = await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.77" },
        body: { username: "nonexistent_rate_user", password: "bad" }
      });
      if (r.status === 429) {
        got429 = true;
        break;
      }
    }
    assert.strictEqual(got429, true, "Rapid brute-force logins must trigger HTTP 429");

    // 10. Client escapeHtml & mergeServerUserIntoState (Cloud Data Loss Prevention)
    console.log("10. Testing escapeHtml XSS neutralization & login cloud-state merge...");
    const xssPayload = `<img src=x onerror="alert('xss')">`;
    const escaped = escapeHtml(xssPayload);
    assert.ok(!escaped.includes("<img") && escaped.includes("&lt;img") && escaped.includes("&quot;") && escaped.includes("&#39;"));

    const freshDeviceState = {
      history: [],
      wrongQuestions: new Set(),
      bookmarks: new Set(),
      solvedQuestionIds: new Set(),
      subjectStats: {},
      streak: 0,
      totalPoints: 0,
      maxRoundToday: 1,
      maxRoundWritten: 1,
      maxRoundPractical: 1,
      shieldCount: 0,
      items: { eraser5050: 2 }
    };
    mergeServerUserIntoState({
      history: [{ date: "2026-11-22", score: 100, total: 10, timestamp: "2026-11-22T01:00:00Z" }],
      wrongQuestions: [12, 45],
      bookmarks: [7],
      solvedQuestionIds: [1, 2, 3],
      subjectStats: { "4": { correct: 8, total: 10 } },
      streak: 5,
      totalPoints: 1200,
      maxRoundWritten: 4,
      maxRoundPractical: 3,
      shieldCount: 2
    }, freshDeviceState);
    assert.strictEqual(freshDeviceState.history.length, 1, "Cloud history must be preserved on login");
    assert.ok(freshDeviceState.wrongQuestions.has(12) && freshDeviceState.wrongQuestions.has(45));
    assert.strictEqual(freshDeviceState.maxRoundPractical, 3);
    assert.strictEqual(freshDeviceState.subjectStats["4"].correct, 8);

    // 11. Static Regression Checks (No selectOption ReferenceError, IME guard present, SRI present)
    console.log("11. Running static regression assertions on app.js, index.html, sw.js...");
    const appSrc = fs.readFileSync(path.join(__dirname, "..", "public", "js", "app.js"), "utf8");
    const htmlSrc = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    const swSrc = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");

    assert.ok(!appSrc.includes("selectOption("), "Dead selectOption() call must be removed from useItemClover");
    assert.ok(appSrc.includes("e.isComposing || e.keyCode === 229"), "IME composition guard must be present");
    assert.ok(appSrc.includes("modalWhatsNew"), "Rule 16 What's New modal must be wired");
    assert.ok(!htmlSrc.includes("user-scalable=no"), "WCAG zoom blocking must be removed");
    assert.ok(htmlSrc.includes('integrity="sha384-'), "KaTeX CDN resources must include SRI");
    assert.ok(swSrc.includes("cache.put(") && swSrc.includes("cache.addAll("), "Service Worker must persist app shell in cache");

    console.log("✅ All v3.3.0 Security Hardening & Bugfix Regression tests passed!");
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runTests().catch(err => {
  console.error("❌ Security & Bugfix Test Failed:", err);
  process.exit(1);
});
