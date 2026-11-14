const assert = require("assert");
const http = require("http");
const fs = require("fs");
const path = require("path");

const { startServer } = require("../server.js");

const TEST_PORT = 8996;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(method, pathStr, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting server for Persistent Auth test suite...");
  const server = await startServer(TEST_PORT);

  try {
    // 1. Test GET /api/version
    console.log("1. Testing GET /api/version and no-store headers");
    const verRes = await request("GET", "/api/version");
    assert.strictEqual(verRes.status, 200, "GET /api/version must return 200 OK");
    assert.strictEqual(verRes.data.success, true);
    assert.ok(verRes.data.version, "version must be present");
    assert.ok(verRes.headers["cache-control"], "Cache-Control must be set");
    assert.ok(verRes.headers["cache-control"].includes("no-store"), "Cache-Control must contain no-store");

    // 2. Test Register & Sync with solvedQuestionIds, shieldCount, items
    console.log("2. Testing User Sync with solvedQuestionIds, shieldCount (max 2), and items");
    const testUser = `persist_user_${Date.now()}`;
    const regRes = await request("POST", "/api/auth/register", {
      username: testUser,
      password: "password123",
      nickname: "지속유저"
    });
    assert.strictEqual(regRes.status, 200);
    const token = regRes.data.token;
    assert.ok(token);

    const syncRes = await request(
      "POST",
      "/api/user/sync",
      {
        solvedQuestionIds: [1, 2, 3, 4, 5],
        shieldCount: 2,
        items: { eraser5050: 3, heart: 2, booster2x: 1 },
        totalPoints: 250,
        maxRoundToday: 3,
        action: "ROUND_CLEAR",
        details: { round: 2, score: 100 }
      },
      { "Authorization": `Bearer ${token}` }
    );

    assert.strictEqual(syncRes.status, 200);
    assert.strictEqual(syncRes.data.success, true);
    assert.deepStrictEqual(syncRes.data.user.solvedQuestionIds, [1, 2, 3, 4, 5]);
    assert.strictEqual(syncRes.data.user.shieldCount, 2);
    assert.strictEqual(syncRes.data.user.items.eraser5050, 3);
    assert.strictEqual(syncRes.data.user.items.heart, 2);
    assert.strictEqual(syncRes.data.user.items.booster2x, 1);

    // 3. Test Shield Cap 2 (should not exceed 2)
    console.log("3. Testing Shield Cap enforcement (cannot exceed 2)");
    const capRes = await request(
      "POST",
      "/api/user/sync",
      { shieldCount: 5 },
      { "Authorization": `Bearer ${token}` }
    );
    assert.strictEqual(capRes.status, 200);
    assert.strictEqual(capRes.data.user.shieldCount, 2, "shieldCount must be capped at 2");

    console.log("✅ All Persistent Auth & Version Endpoint tests passed successfully!");
    server.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Test Failed:", err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
