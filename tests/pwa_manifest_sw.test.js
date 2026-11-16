const assert = require("assert");
const http = require("http");
const { startServer } = require("../server.js");

const TEST_PORT = 8992;
let serverInstance = null;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port: TEST_PORT,
      path,
      method: options.method || "GET",
      headers: options.headers || {}
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Starting server for PWA Manifest, Service Worker & Mobile Releases test suite...");
  serverInstance = await startServer(TEST_PORT);

  try {
    // 1. Test /manifest.json
    console.log("1. Testing GET /manifest.json");
    const manifestRes = await request("/manifest.json");
    assert.strictEqual(manifestRes.status, 200);
    assert.ok(manifestRes.headers["content-type"].includes("application/manifest+json") || manifestRes.headers["content-type"].includes("application/json"));
    assert.strictEqual(manifestRes.body.name, "하루 10제 전기기사 - HaruElec");
    assert.strictEqual(manifestRes.body.short_name, "하루전기");
    assert.strictEqual(manifestRes.body.display, "standalone");
    assert.ok(Array.isArray(manifestRes.body.icons));
    assert.ok(manifestRes.body.icons.length >= 3);

    // 2. Test /sw.js
    console.log("2. Testing GET /sw.js");
    const swRes = await request("/sw.js");
    assert.strictEqual(swRes.status, 200);
    assert.ok(swRes.headers["content-type"].includes("application/javascript"));
    assert.strictEqual(swRes.headers["service-worker-allowed"], "/");
    assert.ok(swRes.body.includes("install"));
    assert.ok(swRes.body.includes("activate"));
    assert.ok(swRes.body.includes("push"));
    assert.ok(swRes.body.includes("notificationclick"));

    // 3. Test High-Res PWA Icons
    console.log("3. Testing High-Res PWA icons (/public/icons/icon-192.png, /public/icons/icon-512.png)");
    const icon192 = await request("/public/icons/icon-192.png");
    assert.strictEqual(icon192.status, 200);
    assert.strictEqual(icon192.headers["content-type"], "image/png");

    const icon512 = await request("/public/icons/icon-512.png");
    assert.strictEqual(icon512.status, 200);
    assert.strictEqual(icon512.headers["content-type"], "image/png");

    // 4. Test Mobile Binary Downloads
    console.log("4. Testing Android APK download serving (/releases/HaruElec-v3.2.0-release.apk)");
    const apkRes = await request("/releases/HaruElec-v3.2.0-release.apk");
    assert.strictEqual(apkRes.status, 200);
    assert.strictEqual(apkRes.headers["content-type"], "application/vnd.android.package-archive");
    assert.ok(apkRes.headers["content-disposition"].includes("attachment; filename=\"HaruElec-v3.2.0-release.apk\""));

    console.log("5. Testing iOS IPA download serving (/releases/HaruElec-v3.2.0.ipa)");
    const ipaRes = await request("/releases/HaruElec-v3.2.0.ipa");
    assert.strictEqual(ipaRes.status, 200);
    assert.strictEqual(ipaRes.headers["content-type"], "application/octet-stream");
    assert.ok(ipaRes.headers["content-disposition"].includes("attachment; filename=\"HaruElec-v3.2.0.ipa\""));

    console.log("✅ All PWA Manifest, Service Worker & Mobile Releases tests passed successfully!");
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runTests();
