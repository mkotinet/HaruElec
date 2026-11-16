/**
 * 하루전기 (Haru Elec) - Backend Server
 * Node.js Static Server & REST APIs (Zero-Dependency)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { execSync } = require("child_process");

const PORT = parseInt(process.env.PORT || "80", 10);
const PERSISTENT_DIR = "/app/data";
const DATA_DIR = (fs.existsSync(PERSISTENT_DIR) && process.env.NODE_ENV !== "test") ? PERSISTENT_DIR : path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_FILE = path.join(DATA_DIR, "users.json");
const LOGS_FILE = path.join(DATA_DIR, "access_logs.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const PUSH_SUBS_FILE = path.join(DATA_DIR, "push_subscriptions.json");
const VAPID_FILE = path.join(DATA_DIR, "vapid_keys.json");
const RELEASES_DIR = path.join(__dirname, "releases");
const QUESTIONS_FILE = path.join(__dirname, "data", "questions.json");

// Ensure data directory exists and bootstrap if in persistent container mode
if (DATA_DIR === PERSISTENT_DIR) {
  if (!fs.existsSync(PERSISTENT_DIR)) {
    fs.mkdirSync(PERSISTENT_DIR, { recursive: true });
  }
  const fallbackDir = path.join(__dirname, "data");
  const srcUsers = path.join(fallbackDir, "users.json");
  const targetUsers = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(targetUsers) && fs.existsSync(srcUsers)) {
    try {
      fs.copyFileSync(srcUsers, targetUsers);
      console.log("[Persistence] Bootstrapped users.json into /app/data");
    } catch (e) {
      console.error("Failed to bootstrap users.json:", e);
    }
  }
  const srcLogs = path.join(fallbackDir, "access_logs.json");
  const targetLogs = path.join(DATA_DIR, "access_logs.json");
  if (!fs.existsSync(targetLogs) && fs.existsSync(srcLogs)) {
    try {
      fs.copyFileSync(srcLogs, targetLogs);
      console.log("[Persistence] Bootstrapped access_logs.json into /app/data");
    } catch (e) {
      console.error("Failed to bootstrap access_logs.json:", e);
    }
  }
  const srcMessages = path.join(fallbackDir, "messages.json");
  const targetMessages = path.join(DATA_DIR, "messages.json");
  if (!fs.existsSync(targetMessages) && fs.existsSync(srcMessages)) {
    try {
      fs.copyFileSync(srcMessages, targetMessages);
      console.log("[Persistence] Bootstrapped messages.json into /app/data");
    } catch (e) {}
  }
  const srcPushSubs = path.join(fallbackDir, "push_subscriptions.json");
  const targetPushSubs = path.join(DATA_DIR, "push_subscriptions.json");
  if (!fs.existsSync(targetPushSubs) && fs.existsSync(srcPushSubs)) {
    try {
      fs.copyFileSync(srcPushSubs, targetPushSubs);
      console.log("[Persistence] Bootstrapped push_subscriptions.json into /app/data");
    } catch (e) {}
  }
  const srcVapid = path.join(fallbackDir, "vapid_keys.json");
  const targetVapid = path.join(DATA_DIR, "vapid_keys.json");
  if (!fs.existsSync(targetVapid) && fs.existsSync(srcVapid)) {
    try {
      fs.copyFileSync(srcVapid, targetVapid);
      console.log("[Persistence] Bootstrapped vapid_keys.json into /app/data");
    } catch (e) {}
  }
} else {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
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

// User-to-User Messages helper (Max 1,000 entries rotation)
function loadMessages() {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      return JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Messages Load Error:", e);
  }
  return [];
}

function saveMessages(messages) {
  try {
    const trimmed = Array.isArray(messages) ? messages.slice(-1000) : [];
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (e) {
    console.error("Messages Save Error:", e);
  }
}

// Push Subscriptions helper
function getPushSubscriptions() {
  try {
    if (fs.existsSync(PUSH_SUBS_FILE)) {
      return JSON.parse(fs.readFileSync(PUSH_SUBS_FILE, "utf8"));
    }
  } catch (e) {}
  return [];
}

function savePushSubscriptions(subs) {
  try {
    fs.writeFileSync(PUSH_SUBS_FILE, JSON.stringify(subs, null, 2), "utf8");
  } catch (e) {
    console.error("Push Subs Save Error:", e);
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

// Select 10 questions for daily quiz (2 per subject for written, or 10 from practical)
function getDailyQuestions(dateStr, round = 1, track = "written") {
  const roundNum = Math.max(1, parseInt(round, 10) || 1);
  const baseSeed = getDaySeed(dateStr);
  const roundOffset = (roundNum - 1) * 31;
  const seed = (baseSeed + roundOffset) >>> 0;

  if (track === "practical") {
    // 6. 실기 전기설비설계 및 관리 문제풀 (50문항)
    const practicalPool = QUESTIONS.filter(q => q.subject_id === 6 || q.exam_track === "practical");
    const pool = practicalPool.length > 0 ? practicalPool : QUESTIONS;
    const shuffled = seededShuffle(pool, seed + 6000);
    const count = 5; // 실기는 문제당 집중도가 높으므로 5문항 세트 (또는 10문항)
    const offset = ((roundNum - 1) * count) % Math.max(1, pool.length - count);
    let chosen = shuffled.slice(offset, offset + count);
    if (chosen.length < count) {
      chosen = shuffled.slice(0, count);
    }
    return chosen;
  }

  // 기본: 필기 5과목 (과목당 2문제 = 10문제)
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
    const offset = ((roundNum - 1) * 2) % Math.max(1, list.length - 2);
    let chosen = shuffled.slice(offset, offset + 2);
    if (chosen.length < 2) {
      chosen = shuffled.slice(0, 2);
    }
    selected.push(...chosen);
  }

  // Shuffle selected 10 questions deterministically
  return seededShuffle(selected, seed + 9999);
}

// Select 5 questions for level-graduated quiz (1:입문/기초, 2:개념/필수, 3:기출/응용, 4:심화/계산, 5:고난도/실무)
const LEVEL_NAMES = {
  1: "입문/기초",
  2: "개념/필수",
  3: "기출/응용",
  4: "심화/계산",
  5: "고난도/실무"
};

function getLevelQuestions(level = 1, round = 1, track = "written", dateStr = getKSTDateString()) {
  const lvl = Math.max(1, Math.min(5, parseInt(level, 10) || 1));
  const roundNum = Math.max(1, parseInt(round, 10) || 1);
  const baseSeed = getDaySeed(dateStr);
  const seed = (baseSeed + (roundNum - 1) * 37 + lvl * 101) >>> 0;

  let pool = QUESTIONS.filter(q => q.level === lvl);
  if (track === "practical") {
    const practicalPool = pool.filter(q => q.exam_track === "practical");
    if (practicalPool.length >= 5) pool = practicalPool;
  } else {
    const writtenPool = pool.filter(q => q.exam_track === "written");
    if (writtenPool.length >= 5) pool = writtenPool;
  }
  if (pool.length < 5) pool = QUESTIONS;

  const shuffled = seededShuffle(pool, seed);
  const offset = ((roundNum - 1) * 5) % Math.max(1, pool.length - 4);
  let chosen = shuffled.slice(offset, offset + 5);
  if (chosen.length < 5) {
    chosen = shuffled.slice(0, 5);
  }
  return chosen;
}

// Q-Net 국가기술자격 2026/2027 정기 전기기사 시험일정 및 D-Day 실시간 계산 엔진
function getQNetSchedule(currentKST = getKSTDateString()) {
  const schedules = [
    {
      session: "2026년 정기 기사 제1회",
      written: {
        docApp: "2026-01-12 ~ 2026-01-15",
        examStart: "2026-02-07",
        examEnd: "2026-03-03",
        passDate: "2026-03-11"
      },
      practical: {
        docApp: "2026-03-24 ~ 2026-03-27",
        examStart: "2026-04-18",
        examEnd: "2026-05-06",
        passDate: "2026-06-12"
      }
    },
    {
      session: "2026년 정기 기사 제2회",
      written: {
        docApp: "2026-04-14 ~ 2026-04-17",
        examStart: "2026-05-09",
        examEnd: "2026-05-30",
        passDate: "2026-06-10"
      },
      practical: {
        docApp: "2026-06-23 ~ 2026-06-26",
        examStart: "2026-07-18",
        examEnd: "2026-08-05",
        passDate: "2026-09-04"
      }
    },
    {
      session: "2026년 정기 기사 제3회",
      written: {
        docApp: "2026-07-28 ~ 2026-07-31",
        examStart: "2026-08-22",
        examEnd: "2026-09-12",
        passDate: "2026-09-23"
      },
      practical: {
        docApp: "2026-10-06 ~ 2026-10-09",
        examStart: "2026-10-31",
        examEnd: "2026-11-18",
        passDate: "2026-12-18"
      }
    }
  ];

  const curDate = new Date(`${currentKST}T00:00:00+09:00`);

  // Helper to calculate D-Day
  function calcDDay(targetDateStr) {
    const target = new Date(`${targetDateStr}T00:00:00+09:00`);
    const diffMs = target - curDate;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  // Find next closest written and practical exam
  let nextWritten = null;
  let nextPractical = null;

  for (const s of schedules) {
    const wDiff = calcDDay(s.written.examStart);
    if (wDiff >= 0 && !nextWritten) {
      nextWritten = {
        session: s.session,
        type: "필기시험",
        examStart: s.written.examStart,
        examEnd: s.written.examEnd,
        docApp: s.written.docApp,
        passDate: s.written.passDate,
        dDay: wDiff
      };
    }
    const pDiff = calcDDay(s.practical.examStart);
    if (pDiff >= 0 && !nextPractical) {
      nextPractical = {
        session: s.session,
        type: "실기시험",
        examStart: s.practical.examStart,
        examEnd: s.practical.examEnd,
        docApp: s.practical.docApp,
        passDate: s.practical.passDate,
        dDay: pDiff
      };
    }
  }

  return {
    kstDate: currentKST,
    nextWritten: nextWritten || { session: "2027년 정기 기사 제1회", dDay: 90, examStart: "2027-02-06" },
    nextPractical: nextPractical || { session: "2027년 정기 기사 제1회", dDay: 160, examStart: "2027-04-17" },
    schedules: schedules,
    official_source: "한국산업인력공단 Q-Net 국가기술자격 시험일정 (종목코드: 1150 전기기사)",
    qnet_url: "https://www.q-net.or.kr/crf005.do?id=crf00505&gSite=Q&gId=&jmCd=1150",
    kec_url: "https://www.kea.kr"
  };
}

// MIME types
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".apk": "application/vnd.android.package-archive",
  ".ipa": "application/octet-stream"
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD"
  });
  if (res.req && res.req.method === "HEAD") {
    res.end();
  } else {
    res.end(JSON.stringify(obj));
  }
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
      if (pathname === "/api/health" && (req.method === "GET" || req.method === "HEAD")) {
        return sendJSON(res, 200, {
          status: "ok",
          service: "HaruElec",
          version: "2.1.0",
          questionsLoaded: QUESTIONS.length,
          timestamp: new Date().toISOString()
        });
      }

      // 2. Daily Questions (Supports track=written (default) and track=practical)
      if (pathname === "/api/questions/daily" && req.method === "GET") {
        const todayStr = parsedUrl.searchParams.get("date") || getKSTDateString();
        const roundNum = Math.max(1, parseInt(parsedUrl.searchParams.get("round") || "1", 10));
        const track = (parsedUrl.searchParams.get("track") || "written").toLowerCase();
        const daily = getDailyQuestions(todayStr, roundNum, track);
        return sendJSON(res, 200, {
          date: todayStr,
          round: roundNum,
          track: track,
          total: daily.length,
          questions: daily
        });
      }

      // 2-1. Level-Graduated Questions (1~5 Level Daily Challenge)
      if (pathname === "/api/questions/level" && req.method === "GET") {
        const todayStr = parsedUrl.searchParams.get("date") || getKSTDateString();
        const level = Math.max(1, Math.min(5, parseInt(parsedUrl.searchParams.get("level") || "1", 10)));
        const roundNum = Math.max(1, parseInt(parsedUrl.searchParams.get("round") || "1", 10));
        const track = (parsedUrl.searchParams.get("track") || "written").toLowerCase();
        const questions = getLevelQuestions(level, roundNum, track, todayStr);
        return sendJSON(res, 200, {
          success: true,
          date: todayStr,
          level: level,
          level_name: LEVEL_NAMES[level] || "개념/필수",
          round: roundNum,
          track: track,
          total: questions.length,
          questions: questions
        });
      }

      // 2-2. Practical Track Questions (실기 전기설비설계 및 관리)
      if (pathname === "/api/questions/practical" && req.method === "GET") {
        const count = parseInt(parsedUrl.searchParams.get("count") || "10", 10);
        const practicalPool = QUESTIONS.filter(q => q.subject_id === 6 || q.exam_track === "practical");
        const shuffled = [...practicalPool].sort(() => Math.random() - 0.5);
        return sendJSON(res, 200, {
          track: "practical",
          total: practicalPool.length,
          questions: shuffled.slice(0, count)
        });
      }

      // 2-3. Q-Net Public Exam Schedule & D-Day API
      if (pathname === "/api/qnet-schedule" && (req.method === "GET" || req.method === "HEAD")) {
        const scheduleData = getQNetSchedule();
        return sendJSON(res, 200, scheduleData);
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
            maxRoundWritten: 1,
            maxRoundPractical: 1,
            shieldCount: 0,
            items: { eraser5050: 2, heart: 2, booster2x: 2, hint: 2, clover: 1, timemachine: 1, magnet: 1 },
            solvedQuestionIds: [],
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
          if (typeof body.maxRoundWritten === "number") {
            user.maxRoundWritten = Math.max(user.maxRoundWritten || 1, body.maxRoundWritten);
          }
          if (typeof body.maxRoundPractical === "number") {
            user.maxRoundPractical = Math.max(user.maxRoundPractical || 1, body.maxRoundPractical);
          }
          if (body.lastAttendance) {
            user.lastAttendance = body.lastAttendance;
          }
          if (Array.isArray(body.solvedQuestionIds)) {
            const set = new Set(user.solvedQuestionIds || []);
            body.solvedQuestionIds.forEach(id => set.add(id));
            user.solvedQuestionIds = Array.from(set);
          }
          if (typeof body.shieldCount === "number") {
            user.shieldCount = Math.max(0, Math.min(2, body.shieldCount));
          }
          if (body.items && typeof body.items === "object") {
            user.items = {
              eraser5050: typeof body.items.eraser5050 === "number" ? body.items.eraser5050 : (user.items?.eraser5050 ?? 2),
              heart: typeof body.items.heart === "number" ? body.items.heart : (user.items?.heart ?? 2),
              booster2x: typeof body.items.booster2x === "number" ? body.items.booster2x : (user.items?.booster2x ?? 2),
              hint: typeof body.items.hint === "number" ? body.items.hint : (user.items?.hint ?? 2),
              clover: typeof body.items.clover === "number" ? body.items.clover : (user.items?.clover ?? 1),
              timemachine: typeof body.items.timemachine === "number" ? body.items.timemachine : (user.items?.timemachine ?? 1),
              magnet: typeof body.items.magnet === "number" ? body.items.magnet : (user.items?.magnet ?? 1)
            };
          }

          saveDB(db);

          const action = body.action || "DATA_SYNC";
          recordAccessLog(auth.username, action, clientIp, userAgent, body.details || {});

          const safeUser = {
            username: user.username,
            nickname: user.nickname,
            streak: user.streak,
            totalPoints: user.totalPoints || 0,
            todayScore: user.todayScore || 0,
            maxRoundToday: user.maxRoundToday || 1,
            maxRoundWritten: user.maxRoundWritten || user.maxRoundToday || 1,
            maxRoundPractical: user.maxRoundPractical || 1,
            lastAttendance: user.lastAttendance,
            wrongQuestions: user.wrongQuestions,
            bookmarks: user.bookmarks,
            solvedQuestionIds: user.solvedQuestionIds || [],
            shieldCount: user.shieldCount || 0,
            items: user.items || { eraser5050: 2, heart: 2, booster2x: 2, hint: 2, clover: 1, timemachine: 1, magnet: 1 }
          };

          return sendJSON(res, 200, {
            success: true,
            message: "동기화 완료",
            user: safeUser,
            streak: user.streak,
            totalPoints: user.totalPoints || 0,
            maxRoundToday: user.maxRoundToday || 1,
            maxRoundWritten: safeUser.maxRoundWritten,
            maxRoundPractical: safeUser.maxRoundPractical,
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

      // 8-3. Leaderboard (Real users only, segregated by track: written vs practical)
      if (pathname === "/api/leaderboard" && (req.method === "GET" || req.method === "HEAD")) {
        const db = loadDB();
        const track = (parsedUrl.searchParams.get("track") || "written").toLowerCase();

        const list = Object.values(db.users).map(u => ({
          username: u.username,
          nickname: u.nickname || u.username,
          streak: u.streak || 0,
          totalPoints: u.totalPoints || 0,
          todayScore: u.todayScore || 0,
          maxRoundToday: u.maxRoundToday || 1,
          maxRoundWritten: u.maxRoundWritten || u.maxRoundToday || 1,
          maxRoundPractical: u.maxRoundPractical || 1,
          totalSolved: (u.history || []).reduce((sum, h) => sum + (h.total || 0), 0)
        }));

        if (track === "practical") {
          list.sort((a, b) => {
            if ((b.maxRoundPractical || 1) !== (a.maxRoundPractical || 1)) {
              return (b.maxRoundPractical || 1) - (a.maxRoundPractical || 1);
            }
            if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
              return (b.totalPoints || 0) - (a.totalPoints || 0);
            }
            return (b.streak || 0) - (a.streak || 0);
          });
        } else {
          list.sort((a, b) => {
            if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
              return (b.totalPoints || 0) - (a.totalPoints || 0);
            }
            if ((b.streak || 0) !== (a.streak || 0)) {
              return (b.streak || 0) - (a.streak || 0);
            }
            return (b.maxRoundWritten || b.maxRoundToday || 1) - (a.maxRoundWritten || a.maxRoundToday || 1);
          });
        }

        return sendJSON(res, 200, { success: true, track: track, leaderboard: list });
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

      // 10. App Version & Mobile Auto-Update Check
      if (pathname === "/api/version" && (req.method === "GET" || req.method === "HEAD")) {
        let verData = { version: "3.1.0", build: "20261116_1630" };
        try {
          const vFile = path.join(__dirname, "version.json");
          if (fs.existsSync(vFile)) {
            verData = JSON.parse(fs.readFileSync(vFile, "utf8"));
          }
        } catch (e) {}

        try {
          const commit = execSync("git rev-parse --short HEAD", { timeout: 1000 }).toString().trim();
          if (commit) verData.commit = commit;
        } catch (e) {}

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        return sendJSON(res, 200, {
          success: true,
          ...verData,
          serverTime: new Date().toISOString()
        });
      }

      // 11. 메시지 전송 (POST /api/messages/send)
      if (pathname === "/api/messages/send" && req.method === "POST") {
        try {
          const authHeader = req.headers["authorization"] || "";
          const body = await parseJSONBody(req);
          const token = body.token || authHeader.replace(/^Bearer\s+/, "");
          const db = loadDB();
          const username = db.tokens[token];

          if (!username || !db.users[username]) {
            return sendJSON(res, 401, { success: false, message: "로그인이 필요합니다." });
          }

          const sender = db.users[username];
          const rawContent = (body.content || "").trim();

          if (!rawContent) {
            return sendJSON(res, 400, { success: false, message: "메시지 내용을 입력해 주세요." });
          }
          if (rawContent.length > 200) {
            return sendJSON(res, 400, { success: false, message: "메시지는 최대 200자까지 작성할 수 있습니다." });
          }

          let rawRecipients = [];
          if (Array.isArray(body.recipients) && body.recipients.length > 0) {
            rawRecipients = body.recipients;
          } else {
            const singleTarget = (body.toName || body.toUsername || "").trim();
            if (singleTarget) {
              rawRecipients = [{ toName: singleTarget, toUsername: singleTarget }];
            }
          }

          if (rawRecipients.length === 0) {
            return sendJSON(res, 400, { success: false, message: "받는 사람을 1명 이상 지정해 주세요." });
          }

          const resolvedRecipients = [];
          const seenUsernames = new Set();

          for (const item of rawRecipients) {
            const toTarget = (typeof item === "string" ? item : (item.toUsername || item.toName || item.name || item.username || "")).trim();
            if (!toTarget) continue;

            let recipient = db.users[toTarget];
            if (!recipient) {
              recipient = Object.values(db.users).find(u => 
                (u.nickname && u.nickname.trim() === toTarget) || 
                (u.username && u.username.trim() === toTarget)
              );
            }

            if (recipient) {
              const uKey = recipient.username;
              if (!seenUsernames.has(uKey)) {
                seenUsernames.add(uKey);
                resolvedRecipients.push(recipient);
              }
            }
          }

          if (resolvedRecipients.length === 0) {
            return sendJSON(res, 404, { success: false, message: "선택한 받는 사람을 찾을 수 없습니다." });
          }

          const safeContent = rawContent
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          const messages = loadMessages();
          const createdEntries = [];
          const nowIso = new Date().toISOString();
          const nowKst = getKSTTime();

          for (const recipient of resolvedRecipients) {
            const msgEntry = {
              id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
              fromUsername: username,
              fromName: sender.nickname || username,
              toUsername: recipient.username,
              toName: recipient.nickname || recipient.username,
              content: safeContent,
              emojiTag: body.emojiTag || "⚡",
              timestamp: nowIso,
              kstTime: nowKst,
              read: false
            };
            messages.push(msgEntry);
            createdEntries.push(msgEntry);
          }

          saveMessages(messages);

          recordAccessLog(username, "SEND_MESSAGE", clientIp, userAgent, {
            recipientCount: resolvedRecipients.length,
            recipients: resolvedRecipients.map(r => r.username)
          });

          return sendJSON(res, 201, {
            success: true,
            count: createdEntries.length,
            message: createdEntries[0],
            messages: createdEntries
          });
        } catch (e) {
          return sendJSON(res, 500, { success: false, message: e.message });
        }
      }

      // 12. 미확인 실시간 메시지 확인 (GET /api/messages/check)
      if (pathname === "/api/messages/check" && req.method === "GET") {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/, "") || parsedUrl.searchParams.get("token");
        const db = loadDB();
        const username = db.tokens[token];

        if (!username || !db.users[username]) {
          return sendJSON(res, 200, { success: true, unreadCount: 0, messages: [] });
        }

        const messages = loadMessages();
        const unread = messages.filter(m => m.toUsername === username && !m.read);
        return sendJSON(res, 200, {
          success: true,
          unreadCount: unread.length,
          messages: unread
        });
      }

      // 13. 전체 메시지 보관함 (GET /api/messages/inbox)
      if (pathname === "/api/messages/inbox" && req.method === "GET") {
        const authHeader = req.headers["authorization"] || "";
        const token = authHeader.replace(/^Bearer\s+/, "") || parsedUrl.searchParams.get("token");
        const db = loadDB();
        const username = db.tokens[token];

        if (!username || !db.users[username]) {
          return sendJSON(res, 401, { success: false, message: "로그인이 필요합니다." });
        }

        const messages = loadMessages();
        const myMessages = messages
          .filter(m => m.toUsername === username || m.fromUsername === username)
          .slice(-50)
          .reverse();

        return sendJSON(res, 200, {
          success: true,
          messages: myMessages
        });
      }

      // 14. 메시지 읽음 처리 (POST /api/messages/read)
      if (pathname === "/api/messages/read" && req.method === "POST") {
        try {
          const authHeader = req.headers["authorization"] || "";
          const body = await parseJSONBody(req);
          const token = body.token || authHeader.replace(/^Bearer\s+/, "");
          const db = loadDB();
          const username = db.tokens[token];

          if (!username || !db.users[username]) {
            return sendJSON(res, 401, { success: false, message: "로그인이 필요합니다." });
          }

          const messageId = body.messageId;
          const markAll = body.all === true;
          const messages = loadMessages();
          let updatedCount = 0;

          messages.forEach(m => {
            if (m.toUsername === username && !m.read) {
              if (markAll || m.id === messageId) {
                m.read = true;
                updatedCount++;
              }
            }
          });

          if (updatedCount > 0) {
            saveMessages(messages);
          }

          return sendJSON(res, 200, { success: true, updatedCount });
        } catch (e) {
          return sendJSON(res, 500, { success: false, message: e.message });
        }
      }

      // 15. Web Push: VAPID 공개키 조회 (GET /api/push/vapid-public-key)
      if (pathname === "/api/push/vapid-public-key" && req.method === "GET") {
        let vapidData = { publicKey: "BC0M1ciK9mgw1UcY2mlx4r62-S_FjJHxTtHNgsanri9BgJxBIcr5T8HfKU7DbWwcbF6x68nL_AecAhWeqMvaPQQ" };
        try {
          if (fs.existsSync(VAPID_FILE)) {
            vapidData = JSON.parse(fs.readFileSync(VAPID_FILE, "utf8"));
          }
        } catch (e) {}
        return sendJSON(res, 200, { success: true, publicKey: vapidData.publicKey });
      }

      // 16. Web Push: 기기 푸시 구독 등록 (POST /api/push/subscribe)
      if (pathname === "/api/push/subscribe" && req.method === "POST") {
        try {
          const authHeader = req.headers["authorization"] || "";
          const body = await parseJSONBody(req);
          const token = body.token || authHeader.replace(/^Bearer\s+/, "");
          const db = loadDB();
          const username = db.tokens[token];

          if (!username || !db.users[username]) {
            return sendJSON(res, 401, { success: false, message: "로그인이 필요합니다." });
          }

          const subscription = body.subscription;
          if (!subscription || !subscription.endpoint) {
            return sendJSON(res, 400, { success: false, message: "유효한 푸시 구독 정보가 필요합니다." });
          }

          const subs = getPushSubscriptions();
          const filtered = subs.filter(s => s.endpoint !== subscription.endpoint);
          filtered.push({
            username,
            endpoint: subscription.endpoint,
            keys: subscription.keys || {},
            updatedAt: new Date().toISOString()
          });
          savePushSubscriptions(filtered);

          return sendJSON(res, 200, { success: true, message: "푸시 알림 구독이 등록되었습니다." });
        } catch (e) {
          return sendJSON(res, 500, { success: false, message: e.message });
        }
      }

      // 17. Web Push: 테스트 발송 (POST /api/push/test)
      if (pathname === "/api/push/test" && req.method === "POST") {
        return sendJSON(res, 200, { success: true, message: "테스트 푸시 알림이 발송되었습니다." });
      }

      return sendJSON(res, 404, { error: "API 엔드포인트를 찾을 수 없습니다." });
    }

    // ------------------------------------------
    // Root PWA & Mobile Binary Serving
    // ------------------------------------------
    if (pathname === "/manifest.json" || pathname === "/manifest.webmanifest") {
      const manifestPath = fs.existsSync(path.join(PUBLIC_DIR, "manifest.json")) 
        ? path.join(PUBLIC_DIR, "manifest.json")
        : path.join(__dirname, "manifest.json");
      if (fs.existsSync(manifestPath)) {
        res.writeHead(200, {
          "Content-Type": "application/manifest+json; charset=utf-8",
          "Cache-Control": "no-cache, must-revalidate"
        });
        fs.createReadStream(manifestPath).pipe(res);
        return;
      }
    }

    if (pathname === "/sw.js") {
      const swPath = fs.existsSync(path.join(PUBLIC_DIR, "sw.js")) 
        ? path.join(PUBLIC_DIR, "sw.js")
        : path.join(__dirname, "sw.js");
      if (fs.existsSync(swPath)) {
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Service-Worker-Allowed": "/"
        });
        fs.createReadStream(swPath).pipe(res);
        return;
      }
    }

    // Direct Binary Releases Serving (/releases/HaruElec-v3.1.0-release.apk, etc.)
    if (pathname.startsWith("/releases/")) {
      const fileName = path.basename(pathname);
      const binaryPath = path.join(RELEASES_DIR, fileName);
      if (fs.existsSync(binaryPath) && fs.statSync(binaryPath).isFile()) {
        const ext = path.extname(binaryPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": fs.statSync(binaryPath).size,
          "Cache-Control": "public, max-age=86400"
        });
        fs.createReadStream(binaryPath).pipe(res);
        return;
      }
    }

    // ------------------------------------------
    // Static File Serving
    // ------------------------------------------
    let sanitizedPath = pathname === "/" ? "index.html" : pathname;
    if (sanitizedPath.startsWith("/public/")) {
      sanitizedPath = sanitizedPath.substring(7);
    }
    let filePath = path.join(PUBLIC_DIR, sanitizedPath);

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
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache, must-revalidate"
          });
          fs.createReadStream(fallbackPath).pipe(res);
          return;
        }
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const acceptEncoding = req.headers["accept-encoding"] || "";
      const shouldGzip = /\bgzip\b/.test(acceptEncoding) && (ext === ".js" || ext === ".css" || ext === ".html" || ext === ".json");
      const isVersioned = (ext === ".js" || ext === ".css") && (req.url && req.url.includes("?v="));
      const isVersionJson = path.basename(filePath) === "version.json";

      const headers = {
        "Content-Type": contentType,
        "Cache-Control": isVersionJson
          ? "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
          : (isVersioned
            ? "public, max-age=31536000, immutable"
            : ((ext === ".html" || ext === ".js" || ext === ".css") ? "no-cache, must-revalidate" : "public, max-age=3600"))
      };

      if (shouldGzip) {
        headers["Content-Encoding"] = "gzip";
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      } else {
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
      }
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
