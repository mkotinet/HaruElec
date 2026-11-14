const http = require("http");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { startServer } = require("../server");

const TEST_PORT = 8998;
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
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: data });
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
  console.log("Starting server for Audit Logs & KST test suite...");
  const server = await startServer(TEST_PORT);

  try {
    console.log("1. Testing Register Access Logging");
    const testUsername = `user_${Date.now()}`;
    const regRes = await request("POST", "/api/auth/register", {
      username: testUsername,
      password: "password123!",
      nickname: "전기학도"
    }, {
      "User-Agent": "TestAgent/1.0",
      "X-Forwarded-For": "203.0.113.195"
    });
    assert.strictEqual(regRes.status, 200);
    const token = regRes.data.token;
    assert(token, "Token should be returned on register");

    console.log("2. Testing Login Success & Fail Logging");
    // Fail
    const failRes = await request("POST", "/api/auth/login", {
      username: testUsername,
      password: "wrong_password"
    }, {
      "User-Agent": "TestAgent/1.0",
      "X-Forwarded-For": "203.0.113.195"
    });
    assert.strictEqual(failRes.status, 401);

    // Success
    const loginRes = await request("POST", "/api/auth/login", {
      username: testUsername,
      password: "password123!"
    }, {
      "User-Agent": "TestAgent/1.0",
      "X-Forwarded-For": "203.0.113.195"
    });
    assert.strictEqual(loginRes.status, 200);

    console.log("3. Testing User Access Logs (/api/user/logs)");
    const userLogsRes = await request("GET", "/api/user/logs", null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(userLogsRes.status, 200);
    assert(Array.isArray(userLogsRes.data.logs), "User logs must be an array");
    assert(userLogsRes.data.logs.length >= 2, "Should contain at least REGISTER and LOGIN logs");
    const actions = userLogsRes.data.logs.map(l => l.action);
    assert(actions.includes("REGISTER"), "Must include REGISTER log");
    assert(actions.includes("LOGIN_SUCCESS"), "Must include LOGIN_SUCCESS log");
    assert.strictEqual(userLogsRes.data.logs[0].ip, "203.0.113.195", "IP should match X-Forwarded-For");

    console.log("4. Testing Admin Audit Logs RBAC (/api/admin/logs)");
    // Non-admin attempt should be 403 Forbidden
    const forbiddenRes = await request("GET", "/api/admin/logs", null, {
      Authorization: `Bearer ${token}`
    });
    assert.strictEqual(forbiddenRes.status, 403, "Regular user must be forbidden from admin logs");

    // Create or login as '단민러브'
    let adminToken;
    const adminReg = await request("POST", "/api/auth/register", {
      username: "단민러브",
      password: "admin_password123!",
      nickname: "단민러브 관리자"
    });
    if (adminReg.status === 200) {
      adminToken = adminReg.data.token;
    } else {
      const adminLogin = await request("POST", "/api/auth/login", {
        username: "단민러브",
        password: "admin_password123!"
      });
      adminToken = adminLogin.data.token;
    }
    assert(adminToken, "Admin token should be available");

    const adminLogsRes = await request("GET", "/api/admin/logs", null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert.strictEqual(adminLogsRes.status, 200, "Admin '단민러브' must have access to admin logs");
    assert(Array.isArray(adminLogsRes.data.logs), "Admin logs must return an array");
    assert(adminLogsRes.data.logs.length > 0, "Admin logs should contain system events");

    console.log("✅ All Audit Logs and RBAC tests passed successfully!");
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
