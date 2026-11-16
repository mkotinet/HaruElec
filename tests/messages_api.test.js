const assert = require("assert");
const http = require("http");
const { startServer } = require("../server.js");

const TEST_PORT = 8993;
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
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🧪 Starting server for Member Messaging & Notification API test suite...");
  serverInstance = await startServer(TEST_PORT);

  try {
    // 1. Setup two test users
    console.log("1. Setting up Sender & Recipient test users");
    const u1 = "msg_sender_" + Date.now();
    const u2 = "msg_receiver_" + Date.now();

    const reg1 = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { username: u1, password: "password123", nickname: "전기마스터" }
    });
    assert.strictEqual(reg1.status, 200);
    const token1 = reg1.body.token;

    const reg2 = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { username: u2, password: "password123", nickname: "회로장인" }
    });
    assert.strictEqual(reg2.status, 200);
    const token2 = reg2.body.token;

    // 2. Test Sending Message
    console.log("2. Testing POST /api/messages/send (with XSS escaping & nickname targeting)");
    const sendRes = await request("/api/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token1}`
      },
      body: {
        toUsername: u2,
        content: "오늘 100점 축하해요! ⚡ <script>alert(1)</script>",
        emojiTag: "⚡"
      }
    });
    assert.strictEqual(sendRes.status, 201);
    assert.strictEqual(sendRes.body.success, true);
    assert.strictEqual(sendRes.body.count, 1);
    const msg = sendRes.body.message;
    assert.strictEqual(msg.fromUsername, u1);
    assert.strictEqual(msg.toUsername, u2);
    assert.strictEqual(msg.read, false);
    assert.ok(msg.content.includes("&lt;script&gt;"), "XSS tags must be escaped");

    // 3. Test Checking Unread Messages
    console.log("3. Testing GET /api/messages/check for recipient");
    const checkRes = await request("/api/messages/check", {
      headers: { "Authorization": `Bearer ${token2}` }
    });
    assert.strictEqual(checkRes.status, 200);
    assert.strictEqual(checkRes.body.success, true);
    assert.strictEqual(checkRes.body.unreadCount, 1);
    assert.strictEqual(checkRes.body.messages[0].id, msg.id);

    // 4. Test Inbox
    console.log("4. Testing GET /api/messages/inbox");
    const inboxRes = await request("/api/messages/inbox", {
      headers: { "Authorization": `Bearer ${token2}` }
    });
    assert.strictEqual(inboxRes.status, 200);
    assert.strictEqual(inboxRes.body.success, true);
    assert.ok(inboxRes.body.messages.length >= 1);
    assert.strictEqual(inboxRes.body.messages[0].id, msg.id);

    // 5. Test Mark Read
    console.log("5. Testing POST /api/messages/read");
    const readRes = await request("/api/messages/read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token2}`
      },
      body: { messageId: msg.id }
    });
    assert.strictEqual(readRes.status, 200);
    assert.strictEqual(readRes.body.success, true);
    assert.strictEqual(readRes.body.updatedCount, 1);

    // Verify unread count is now 0
    const checkAfterRead = await request("/api/messages/check", {
      headers: { "Authorization": `Bearer ${token2}` }
    });
    assert.strictEqual(checkAfterRead.body.unreadCount, 0);

    // 6. Test Web Push VAPID and Subscription
    console.log("6. Testing Web Push VAPID & Subscription endpoints");
    const vapidRes = await request("/api/push/vapid-public-key");
    assert.strictEqual(vapidRes.status, 200);
    assert.ok(vapidRes.body.publicKey, "VAPID public key must exist");

    const subRes = await request("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token2}`
      },
      body: {
        subscription: {
          endpoint: "https://fcm.googleapis.com/fcm/send/test_endpoint_" + Date.now(),
          keys: { p256dh: "test_p256dh", auth: "test_auth" }
        }
      }
    });
    assert.strictEqual(subRes.status, 200);
    assert.strictEqual(subRes.body.success, true);

    const testPushRes = await request("/api/push/test", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token2}` }
    });
    assert.strictEqual(testPushRes.status, 200);
    assert.strictEqual(testPushRes.body.success, true);

    console.log("✅ All Member Messaging & Notification API tests passed successfully!");
  } finally {
    if (serverInstance) serverInstance.close();
  }
}

runTests();
