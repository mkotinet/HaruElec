/**
 * 하루전기 (Haru Elec) - Backend Server
 * Node.js Static Server & REST APIs (Zero-Dependency)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PORT = parseInt(process.env.PORT || "80", 10);
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_FILE = path.join(DATA_DIR, "users.json");
const LOGS_FILE = path.join(DATA_DIR, "access_logs.json");
const QUESTIONS_FILE = path.join(DATA_DIR, "questions.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load questions bank
let QUESTIONS = [];
try {
  if (fs.existsSync(QUESTIONS_FILE)) {
    QUESTIONS = JSON.parse(fs.readFileSync(QUESTIONS_FILE, "utf8"));
  }
} catch (e) {
  console.error("Failed to load questions.json:", e);
}

// In-memory / JSON Database helper
function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (e) {
    console.error("DB Load Error:", e);
  }
  return { users: {}, tokens: {} };
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (e) {
    console.error("DB Save Error:", e);
  }
}

// Access Logs helper (Max 1,000 entries rotation)
function loadLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(LOGS_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Logs Load Error:", e);
  }
  return [];
}

function saveLogs(logs) {
  try {
    const trimmed = logs.slice(-1000);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("Logs Save Error:", e);
  }
}

function getKSTTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60000));
  return kst.toISOString().replace(/T/, " ").replace(/\..+/, "");
}

function getKSTDateString(dateObj = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(dateObj);
  } catch (e) {
    const now = dateObj || new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kst = new Date(utc + (9 * 60 * 60000));
    return kst.toISOString().split("T")[0];
  }
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket ? (req.socket.remoteAddress || "").replace(/^.*:/, "") : "-";
}

function recordAccessLog(username, action, ip, userAgent, details = {}) {
  const logs = loadLogs();
  const entry = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    kstTime: getKSTTime(),
    username: username || "게스트",
    action: action, // REGISTER, LOGIN_SUCCESS, LOGIN_FAIL, ROUND_CLEAR, DATA_SYNC
    ip: ip || "-",
    userAgent: (userAgent || "-").substring(0, 200),
    details: details
  };
  logs.push(entry);
  saveLogs(logs);
  return entry;
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "haru_elec_salt_2026").digest("hex");
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Simple deterministic PRNG based on date string (MurmurHash/LCG inspired)
function getDaySeed(dateStr) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function seededShuffle(array, seed) {
  const result = [...array];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Select 10 questions for daily quiz (2 per subject)
function getDailyQuestions(dateStr) {
  const seed = getDaySeed(dateStr);
  const bySubject = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  QUESTIONS.forEach(q => {
    if (bySubject[q.subject_id]) {
      bySubject[q.subject_id].push(q);
    }
  });

  const selected = [];
  for (let sId = 1; sId <= 5; sId++) {
    const list = bySubject[sId] || [];
    const shuffled = seededShuffle(list, seed + sId * 1000);
    const chosen = shuffled.slice(0, 2);
    selected.push(...chosen);
  }

  // Shuffle selected 10 questions deterministically
  return seededShuffle(selected, seed + 9999);
}

// MIME types
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8"
};

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(obj));
}

function authenticate(req, db) {
  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7).trim();
  const username = db.tokens[token];
  if (!username || !db.users[username]) return null;
  return { username, user: db.users[username], token };
}

// Server Request Handler
function createServerHandler() {
  return async function handler(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "-";

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      });
      res.end();
      return;
    }

    const db = loadDB();

    // ------------------------------------------
    // API Routes
    // ------------------------------------------
    if (pathname.startsWith("/api/")) {
      // 1. Health
      if (pathname === "/api/health" && req.method === "GET") {
        return sendJSON(res, 200, {
          status: "ok",
          service: "HaruElec",
          version: "1.0.0",
          questionsLoaded: QUESTIONS.length,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Daily Questions
      if (pathname === "/api/questions/daily" && req.method === "GET") {
        const todayStr = parsedUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
        const daily = getDailyQuestions(todayStr);
        return sendJSON(res, 200, {
          date: todayStr,
          total: daily.length,
          questions: daily
        });
      }

      // 3. Practice Questions
      if (pathname === "/api/questions/practice" && req.method === "GET") {
        const subjectId = parseInt(parsedUrl.searchParams.get("subject") || "0", 10);
        const count = parseInt(parsedUrl.searchParams.get("count") || "10", 10);

        let pool = QUESTIONS;
        if (subjectId >= 1 && subjectId <= 5) {
          pool = QUESTIONS.filter(q => q.subject_id === subjectId);
        }

        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return sendJSON(res, 200, {
          subject_id: subjectId,
          questions: shuffled.slice(0, count)
        });
      }

      // 3-1. KEC Revision Focus Questions
      if (pathname === "/api/questions/kec" && req.method === "GET") {
        const kecQuestions = QUESTIONS.filter(q => q.kec_revision && q.kec_revision.is_revised);
        return sendJSON(res, 200, {
          total: kecQuestions.length,
          questions: kecQuestions
        });
      }

      // 3-2. Question Search (Keyword Search across question, explanation, source, KEC topics)
      if (pathname === "/api/questions/search" && req.method === "GET") {
        const qParam = (parsedUrl.searchParams.get("q") || "").trim().toLowerCase();
        if (!qParam) {
          return sendJSON(res, 200, { query: "", total: 0, questions: [] });
        }
        const matched = QUESTIONS.filter(q => {
          const inQuestion = (q.question || "").toLowerCase().includes(qParam);
          const inExp = (q.explanation || "").toLowerCase().includes(qParam);
          const inSource = (q.official_source || "").toLowerCase().includes(qParam);
          const inSubject = (q.subject || "").toLowerCase().includes(qParam);
          let inKec = false;
          if (q.kec_revision) {
            inKec = (q.kec_revision.topic || "").toLowerCase().includes(qParam) ||
                    (q.kec_revision.before || "").toLowerCase().includes(qParam) ||
                    (q.kec_revision.after || "").toLowerCase().includes(qParam);
          }
          return inQuestion || inExp || inSource || inSubject || inKec;
        });
        return sendJSON(res, 200, {
          query: qParam,
          total: matched.length,
          questions: matched
        });
      }

      // 4. Auth: Register
      if (pathname === "/api/auth/register" && req.method === "POST") {
        try {
          const body = await parseJSONBody(req);
          const { username, password, nickname } = body;
          if (!username || !password) {
            return sendJSON(res, 400, { error: "아이디와 비밀번호를 입력해주세요." });
          }
          const trimmedUser = username.trim();
          if (db.users[trimmedUser]) {
            return sendJSON(res, 409, { error: "이미 존재하는 아이디입니다." });
          }

          const passwordHash = hashPassword(password);
          const token = generateToken();
          const newUser = {
            username: trimmedUser,
            nickname: (nickname || trimmedUser).trim(),
            passwordHash,
            createdAt: new Date().toISOString(),
            streak: 0,
            totalPoints: 0,
            todayScore: 0,
            maxRoundToday: 1,
            lastAttendance: "",
            history: [],
            wrongQuestions: [],
            bookmarks: []
          };

          db.users[trimmedUser] = newUser;
          db.tokens[token] = trimmedUser;
          saveDB(db);

          recordAccessLog(trimmedUser, "REGISTER", clientIp, userAgent, { nickname: newUser.nickname });

          const { passwordHash: _, ...safeUser } = newUser;
          return sendJSON(res, 200, { message: "회원가입 완료", token, user: safeUser });
        } catch (e) {
          return sendJSON(res, 400, { error: e.message });
        }
      }

      // 5. Auth: Login
      if (pathname === "/api/auth/login" && req.method === "POST") {
        try {
          const body = await parseJSONBody(req);
          const { username, password } = body;
          const trimmedUser = (username || "").trim();
          const user = db.users[trimmedUser];
          if (!user || user.passwordHash !== hashPassword(password)) {
            recordAccessLog(trimmedUser, "LOGIN_FAIL", clientIp, userAgent, { reason: "인증 실패" });
            return sendJSON(res, 401, { error: "아이디 또는 비밀번호가 일치하지 않습니다." });
          }

          const token = generateToken();
          db.tokens[token] = trimmedUser;
          saveDB(db);

          recordAccessLog(trimmedUser, "LOGIN_SUCCESS", clientIp, userAgent, { nickname: user.nickname });

          const { passwordHash: _, ...safeUser } = user;
          return sendJSON(res, 200, { message: "로그인 성공", token, user: safeUser });
        } catch (e) {
          return sendJSON(res, 400, { error: e.message });
        }
      }

      // 6. Auth: Me
      if (pathname === "/api/auth/me" && req.method === "GET") {
        const auth = authenticate(req, db);
        if (!auth) {
          return sendJSON(res, 401, { error: "인증이 유효하지 않습니다." });
        }
        const { passwordHash: _, ...safeUser } = auth.user;
        return sendJSON(res, 200, { user: safeUser });
      }

      // 7. User Progress Sync
      if (pathname === "/api/user/sync" && req.method === "POST") {
        const auth = authenticate(req, db);
        if (!auth) {
          return sendJSON(res, 401, { error: "인증이 필요합니다." });
        }

        try {
          const body = await parseJSONBody(req);
          const user = auth.user;

          if (Array.isArray(body.history)) {
            user.history = body.history;
          }
          if (Array.isArray(body.wrongQuestions)) {
            user.wrongQuestions = body.wrongQuestions;
          }
          if (Array.isArray(body.bookmarks)) {
            user.bookmarks = body.bookmarks;
          }
          if (typeof body.streak === "number") {
            user.streak = Math.max(user.streak || 0, body.streak);
          }
          if (typeof body.totalPoints === "number") {
            user.totalPoints = Math.max(user.totalPoints || 0, body.totalPoints);
          }
          if (typeof body.todayScore === "number") {
            user.todayScore = body.todayScore;
          }
          if (typeof body.maxRoundToday === "number") {
            user.maxRoundToday = Math.max(user.maxRoundToday || 1, body.maxRoundToday);
          }
          if (body.lastAttendance) {
            user.lastAttendance = body.lastAttendance;
          }

          saveDB(db);

          const action = body.action || "DATA_SYNC";
          recordAccessLog(auth.username, action, clientIp, userAgent, body.details || {});

          return sendJSON(res, 200, {
            message: "동기화 완료",
            streak: user.streak,
            totalPoints: user.totalPoints || 0,
            maxRoundToday: user.maxRoundToday || 1,
            lastAttendance: user.lastAttendance,
            wrongQuestions: user.wrongQuestions,
            bookmarks: user.bookmarks
          });
        } catch (e) {
          return sendJSON(res, 400, { error: e.message });
        }
      }

      // 8. User Stats
      if (pathname === "/api/user/stats" && req.method === "GET") {
        const auth = authenticate(req, db);
        if (!auth) {
          return sendJSON(res, 401, { error: "인증이 필요합니다." });
        }
        const user = auth.user;
        const history = user.history || [];
        const totalSolved = history.reduce((sum, h) => sum + (h.total || 0), 0);
        const totalCorrect = history.reduce((sum, h) => sum + (h.score ? Math.round((h.score / 100) * (h.total || 10)) : 0), 0);

        return sendJSON(res, 200, {
          username: user.username,
          nickname: user.nickname,
          streak: user.streak || 0,
          totalPoints: user.totalPoints || 0,
          maxRoundToday: user.maxRoundToday || 1,
          lastAttendance: user.lastAttendance || "",
          totalDays: history.length,
          totalSolved,
          totalCorrect,
          overallAccuracy: totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0,
          wrongCount: (user.wrongQuestions || []).length,
          bookmarkCount: (user.bookmarks || []).length
        });
      }

      // 8-1. User Logs (Recent 30 logs for current user)
      if (pathname === "/api/user/logs" && req.method === "GET") {
        const auth = authenticate(req, db);
        if (!auth) {
          return sendJSON(res, 401, { success: false, error: "로그인이 필요합니다." });
        }
        const logs = loadLogs();
        const userLogs = logs.filter(l => l.username === auth.username).slice(-30).reverse();
        return sendJSON(res, 200, { success: true, logs: userLogs });
      }

      // 8-2. Admin Audit Logs (Recent 1,000 logs, restricted strictly to '단민러브')
      if (pathname === "/api/admin/logs" && req.method === "GET") {
        const auth = authenticate(req, db);
        if (!auth || auth.username !== "단민러브") {
          return sendJSON(res, 403, { success: false, error: "관리자('단민러브') 권한이 필요합니다." });
        }
        const logs = loadLogs();
        return sendJSON(res, 200, { success: true, logs: logs.slice(-1000).reverse() });
      }

      // 9. Git Sync (for Portainer webhook or manual sync)
      if (pathname === "/api/sync/github" && req.method === "POST") {
        try {
          const output = execSync("git pull origin main 2>&1", { cwd: __dirname }).toString();
          return sendJSON(res, 200, { message: "Git pull completed", output });
        } catch (e) {
          return sendJSON(res, 500, { error: "Git sync failed", details: e.message });
        }
      }

      return sendJSON(res, 404, { error: "API 엔드포인트를 찾을 수 없습니다." });
    }

    // ------------------------------------------
    // Static File Serving
    // ------------------------------------------
    let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);

    // Basic path traversal protection
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA if not found
        const fallbackPath = path.join(PUBLIC_DIR, "index.html");
        if (fs.existsSync(fallbackPath)) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          fs.createReadStream(fallbackPath).pipe(res);
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
    });
  };
}

function startServer(port = PORT) {
  return new Promise((resolve) => {
    const handler = createServerHandler();
    const server = http.createServer(handler);
    server.listen(port, () => {
      console.log(`⚡ HaruElec server is listening on port ${port}`);
      resolve(server);
    });
  });
}

// Direct run
if (require.main === module) {
  startServer(PORT);
}

module.exports = { startServer, createServerHandler };
