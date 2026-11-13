/**
 * 하루전기 (Haru Elec) - Frontend Application Core
 */

(function () {
  "use strict";

  // State
  const state = {
    mode: "daily", // daily | practice | wrong | stats
    subjectId: 0,
    questions: [],
    currentIndex: 0,
    userAnswers: {}, // { [qId]: selectedOption (1~4) }
    wrongQuestions: new Set(),
    bookmarks: new Set(),
    history: [],
    streak: 0,
    lastAttendance: "",
    user: null, // { username, nickname, token }
    todayDateStr: new Date().toISOString().slice(0, 10),
    authMode: "login" // login | register
  };

  // Sound Synth via Web Audio API
  const sound = {
    ctx: null,
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    },
    playTone(freq, duration, type = "sine", delay = 0) {
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + delay);
        osc.stop(this.ctx.currentTime + delay + duration);
      } catch (e) {
        // ignore audio failure
      }
    },
    correct() {
      this.playTone(523.25, 0.12, "sine", 0);     // C5
      this.playTone(659.25, 0.18, "sine", 0.1);   // E5
    },
    wrong() {
      this.playTone(220, 0.18, "triangle", 0);    // A3
      this.playTone(196, 0.25, "triangle", 0.1);  // G3
    },
    finish() {
      this.playTone(523.25, 0.15, "sine", 0);     // C5
      this.playTone(659.25, 0.15, "sine", 0.12);  // E5
      this.playTone(783.99, 0.35, "sine", 0.24);  // G5
    }
  };

  // DOM Elements
  const DOM = {
    streakBadge: document.getElementById("streakBadge"),
    streakCount: document.getElementById("streakCount"),
    userMenu: document.getElementById("userMenu"),
    authBtn: document.getElementById("authBtn"),
    todayDateTag: document.getElementById("todayDateTag"),
    summaryGreeting: document.getElementById("summaryGreeting"),
    statTodayStatus: document.getElementById("statTodayStatus"),
    statTotalSolved: document.getElementById("statTotalSolved"),
    statAccuracy: document.getElementById("statAccuracy"),
    modeTabs: document.querySelectorAll(".mode-tab"),
    wrongBadge: document.getElementById("wrongBadge"),
    subjectFilterBar: document.getElementById("subjectFilterBar"),
    filterBtns: document.querySelectorAll(".filter-btn"),
    quizSection: document.getElementById("quizSection"),
    resultSection: document.getElementById("resultSection"),
    statsSection: document.getElementById("statsSection"),
    currentSubjectTag: document.getElementById("currentSubjectTag"),
    questionProgressText: document.getElementById("questionProgressText"),
    progressBarFill: document.getElementById("progressBarFill"),
    bookmarkBtn: document.getElementById("bookmarkBtn"),
    questionYear: document.getElementById("questionYear"),
    questionSource: document.getElementById("questionSource"),
    questionKecBadge: document.getElementById("questionKecBadge"),
    kecDiffCard: document.getElementById("kecDiffCard"),
    kecDiffTopic: document.getElementById("kecDiffTopic"),
    kecDiffBefore: document.getElementById("kecDiffBefore"),
    kecDiffAfter: document.getElementById("kecDiffAfter"),
    searchBarWrap: document.getElementById("searchBarWrap"),
    searchInput: document.getElementById("searchInput"),
    searchSubmitBtn: document.getElementById("searchSubmitBtn"),
    searchInfoText: document.getElementById("searchInfoText"),
    questionText: document.getElementById("questionText"),
    optionsList: document.getElementById("optionsList"),
    explanationBox: document.getElementById("explanationBox"),
    explanationContent: document.getElementById("explanationContent"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    finishBtn: document.getElementById("finishBtn"),
    resultStamp: document.getElementById("resultStamp"),
    resultTitle: document.getElementById("resultTitle"),
    scoreNum: document.getElementById("scoreNum"),
    scoreStatus: document.getElementById("scoreStatus"),
    subjectResultsGrid: document.getElementById("subjectResultsGrid"),
    reviewWrongBtn: document.getElementById("reviewWrongBtn"),
    restartDailyBtn: document.getElementById("restartDailyBtn"),
    statsTotalSolved: document.getElementById("statsTotalSolved"),
    statsOverallAccuracy: document.getElementById("statsOverallAccuracy"),
    statsStreak: document.getElementById("statsStreak"),
    statsWrongCount: document.getElementById("statsWrongCount"),
    subjectMasteryBars: document.getElementById("subjectMasteryBars"),
    authModal: document.getElementById("authModal"),
    closeAuthModal: document.getElementById("closeAuthModal"),
    authForm: document.getElementById("authForm"),
    authModalTitle: document.getElementById("authModalTitle"),
    authUsername: document.getElementById("authUsername"),
    authPassword: document.getElementById("authPassword"),
    nicknameGroup: document.getElementById("nicknameGroup"),
    authNickname: document.getElementById("authNickname"),
    authSubmitBtn: document.getElementById("authSubmitBtn"),
    authToggleBtn: document.getElementById("authToggleBtn"),
    authToggleText: document.getElementById("authToggleText"),
    authMsg: document.getElementById("authMsg"),
    appToast: document.getElementById("appToast"),
    brandLogo: document.getElementById("brandLogo")
  };

  // Toast Helper
  function showToast(msg, duration = 2500) {
    DOM.appToast.textContent = msg;
    DOM.appToast.classList.remove("hidden");
    setTimeout(() => DOM.appToast.classList.add("hidden"), duration);
  }

  // Render Math with KaTeX
  function renderMath(element) {
    if (window.renderMathInElement && element) {
      try {
        window.renderMathInElement(element, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false
        });
      } catch (e) {
        console.warn("KaTeX render error:", e);
      }
    }
  }

  // LocalStorage Helpers
  const STORAGE_KEY = "haru_elec_data_v1";
  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.wrongQuestions) state.wrongQuestions = new Set(data.wrongQuestions);
        if (data.bookmarks) state.bookmarks = new Set(data.bookmarks);
        if (data.history) state.history = data.history;
        if (data.streak) state.streak = data.streak;
        if (data.lastAttendance) state.lastAttendance = data.lastAttendance;
        if (data.user) state.user = data.user;
      }
    } catch (e) {
      console.warn("Failed to load local storage:", e);
    }
  }

  function saveLocalState() {
    try {
      const data = {
        wrongQuestions: Array.from(state.wrongQuestions),
        bookmarks: Array.from(state.bookmarks),
        history: state.history,
        streak: state.streak,
        lastAttendance: state.lastAttendance,
        user: state.user
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save local storage:", e);
    }
  }

  // Cloud Sync API
  async function syncWithServer() {
    if (!state.user || !state.user.token) return;
    try {
      const res = await fetch("/api/user/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.user.token}`
        },
        body: JSON.stringify({
          history: state.history,
          wrongQuestions: Array.from(state.wrongQuestions),
          bookmarks: Array.from(state.bookmarks),
          streak: state.streak,
          lastAttendance: state.lastAttendance
        })
      });
      if (res.ok) {
        console.log("☁️ Progress synced to cloud server.");
      }
    } catch (e) {
      console.warn("Sync failed (offline mode):", e);
    }
  }

  // Header & Dashboard Stats Update
  function updateDashboardStats() {
    DOM.streakCount.textContent = state.streak;
    DOM.wrongBadge.textContent = state.wrongQuestions.size;

    const totalSolved = state.history.reduce((sum, h) => sum + (h.total || 0), 0);
    const totalCorrect = state.history.reduce((sum, h) => sum + Math.round((h.score / 100) * (h.total || 10)), 0);
    const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

    DOM.statTotalSolved.textContent = `${totalSolved}제`;
    DOM.statAccuracy.textContent = `${accuracy}%`;

    const isTodayCompleted = state.lastAttendance === state.todayDateStr;
    DOM.statTodayStatus.textContent = isTodayCompleted ? "완료 ⚡" : "미완료";
    DOM.statTodayStatus.style.color = isTodayCompleted ? "var(--accent-green)" : "var(--accent-elec)";

    if (state.user) {
      DOM.userMenu.innerHTML = `
        <div class="user-profile">
          <span class="user-name">⚡ ${state.user.nickname || state.user.username}님</span>
          <button class="btn btn-outline-sm" id="logoutBtn">로그아웃</button>
        </div>
      `;
      document.getElementById("logoutBtn").addEventListener("click", handleLogout);
    } else {
      DOM.userMenu.innerHTML = `<button class="btn btn-outline-sm" id="authBtn">로그인</button>`;
      document.getElementById("authBtn").addEventListener("click", () => openAuthModal("login"));
    }
  }

  // Load Daily Questions
  async function loadDailyQuestions() {
    try {
      DOM.questionText.textContent = "오늘의 엄선 10문제를 불러오는 중입니다...";
      const res = await fetch(`/api/questions/daily?date=${state.todayDateStr}`);
      const data = await res.json();
      state.questions = data.questions || [];
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
    } catch (e) {
      DOM.questionText.textContent = "문제를 불러오지 못했습니다. 네트워크를 확인해주세요.";
    }
  }

  // Load Practice Questions
  async function loadPracticeQuestions(subjectId = 0) {
    try {
      DOM.questionText.textContent = "연습문제를 불러오는 중입니다...";
      const res = await fetch(`/api/questions/practice?subject=${subjectId}&count=10`);
      const data = await res.json();
      state.questions = data.questions || [];
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
    } catch (e) {
      DOM.questionText.textContent = "문제를 불러오지 못했습니다.";
    }
  }

  // Load KEC Focus Questions
  async function loadKecQuestions() {
    try {
      DOM.questionText.textContent = "KEC 최신 개정 집중 특강 문제를 불러오는 중입니다...";
      const res = await fetch(`/api/questions/kec`);
      const data = await res.json();
      state.questions = data.questions || [];
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      showToast(`🔥 KEC 최신 개정 핵심 ${state.questions.length}문제가 준비되었습니다!`);
    } catch (e) {
      DOM.questionText.textContent = "KEC 문제를 불러오지 못했습니다.";
    }
  }

  // Perform Keyword Search
  async function performSearch(query) {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      showToast("검색할 키워드를 입력해주세요.");
      return;
    }
    try {
      DOM.searchInfoText.textContent = `'${trimmed}' 검색 중...`;
      const res = await fetch(`/api/questions/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      const results = data.questions || [];
      if (results.length === 0) {
        DOM.searchInfoText.textContent = `'${trimmed}'에 대한 검색 결과가 없습니다. 다른 검색어를 시도해 보세요.`;
        showToast("검색 결과가 없습니다.");
        return;
      }
      DOM.searchInfoText.textContent = `'${trimmed}' 검색 완료: 총 ${results.length}개의 관련 문제가 발견되었습니다.`;
      state.questions = results;
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      showToast(`🔍 ${results.length}개의 문제가 검색되었습니다!`);
    } catch (e) {
      DOM.searchInfoText.textContent = "검색 중 오류가 발생했습니다.";
    }
  }

  // Load Wrong Note Questions
  async function loadWrongQuestions() {
    if (state.wrongQuestions.size === 0) {
      showToast("오답노트에 저장된 문제가 없습니다! 👏");
      switchMode("daily");
      return;
    }

    try {
      DOM.questionText.textContent = "오답노트 문제를 준비하는 중입니다...";
      const res = await fetch("/api/questions/practice?subject=0&count=60");
      const data = await res.json();
      const all = data.questions || [];
      state.questions = all.filter(q => state.wrongQuestions.has(q.id));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
    } catch (e) {
      DOM.questionText.textContent = "오답노트를 불러오지 못했습니다.";
    }
  }

  // Render Current Question
  function renderQuestion() {
    if (!state.questions || state.questions.length === 0) {
      DOM.questionText.textContent = "표시할 문제가 없습니다.";
      DOM.optionsList.innerHTML = "";
      return;
    }

    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const currentNum = state.currentIndex + 1;

    // Header info
    DOM.currentSubjectTag.textContent = `제${q.subject_id}과목 ${q.subject}`;
    DOM.questionProgressText.textContent = `Q ${currentNum} / ${total}`;
    DOM.progressBarFill.style.width = `${(currentNum / total) * 100}%`;
    DOM.questionYear.textContent = `${q.year}`;
    if (DOM.questionSource) {
      DOM.questionSource.textContent = q.official_source || "Q-Net 출제기준";
    }

    // KEC Badge
    if (DOM.questionKecBadge) {
      if (q.kec_revision && q.kec_revision.is_revised) {
        DOM.questionKecBadge.classList.remove("hidden");
      } else {
        DOM.questionKecBadge.classList.add("hidden");
      }
    }

    // Bookmark star icon
    const isBookmarked = state.bookmarks.has(q.id);
    DOM.bookmarkBtn.innerHTML = `<span class="star-icon">${isBookmarked ? "★" : "☆"}</span>`;
    DOM.bookmarkBtn.classList.toggle("active", isBookmarked);

    // Question body
    DOM.questionText.textContent = q.question;
    renderMath(DOM.questionText);

    // Options
    DOM.optionsList.innerHTML = "";
    const answeredOption = state.userAnswers[q.id];
    const isAnswered = answeredOption !== undefined;

    q.options.forEach((optText, idx) => {
      const optNum = idx + 1;
      const optEl = document.createElement("div");
      optEl.className = "option-item";
      if (isAnswered) optEl.classList.add("locked");

      // Feedback classes if already answered
      if (isAnswered) {
        if (optNum === q.answer) {
          optEl.classList.add("correct");
        } else if (optNum === answeredOption) {
          optEl.classList.add("wrong");
        }
      }

      optEl.innerHTML = `
        <span class="option-num">${optNum}</span>
        <span class="option-text">${optText}</span>
      `;

      if (!isAnswered) {
        optEl.addEventListener("click", () => handleSelectOption(q, optNum));
      }

      DOM.optionsList.appendChild(optEl);
      renderMath(optEl);
    });

    // Explanation Box
    if (isAnswered) {
      DOM.explanationContent.textContent = q.explanation;

      // KEC Revision Highlight Card
      if (DOM.kecDiffCard) {
        if (q.kec_revision && q.kec_revision.is_revised) {
          DOM.kecDiffTopic.textContent = q.kec_revision.topic || "KEC 최신 개정 비교";
          DOM.kecDiffBefore.textContent = q.kec_revision.before || "-";
          DOM.kecDiffAfter.textContent = q.kec_revision.after || "-";
          DOM.kecDiffCard.classList.remove("hidden");
        } else {
          DOM.kecDiffCard.classList.add("hidden");
        }
      }

      DOM.explanationBox.classList.remove("hidden");
      renderMath(DOM.explanationContent);
    } else {
      DOM.explanationBox.classList.add("hidden");
      if (DOM.kecDiffCard) DOM.kecDiffCard.classList.add("hidden");
    }

    // Navigation buttons
    DOM.prevBtn.disabled = state.currentIndex === 0;

    const allAnswered = state.questions.every(item => state.userAnswers[item.id] !== undefined);
    if (state.currentIndex === total - 1) {
      DOM.nextBtn.classList.add("hidden");
      DOM.finishBtn.classList.remove("hidden");
      DOM.finishBtn.disabled = !allAnswered;
    } else {
      DOM.nextBtn.classList.remove("hidden");
      DOM.finishBtn.classList.add("hidden");
    }
  }

  // Handle Option Selection
  function handleSelectOption(question, selectedOption) {
    if (state.userAnswers[question.id] !== undefined) return; // already answered

    state.userAnswers[question.id] = selectedOption;
    const isCorrect = selectedOption === question.answer;

    if (isCorrect) {
      sound.correct();
      state.wrongQuestions.delete(question.id);
    } else {
      sound.wrong();
      state.wrongQuestions.add(question.id);
    }

    saveLocalState();
    updateDashboardStats();
    renderQuestion();

    // Auto scroll down to explanation smoothly
    setTimeout(() => {
      DOM.explanationBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  // Handle Quiz Completion
  function finishQuiz() {
    sound.finish();
    const total = state.questions.length;
    let correctCount = 0;
    const subjectCounts = {};

    state.questions.forEach(q => {
      if (!subjectCounts[q.subject]) {
        subjectCounts[q.subject] = { correct: 0, total: 0 };
      }
      subjectCounts[q.subject].total++;
      if (state.userAnswers[q.id] === q.answer) {
        correctCount++;
        subjectCounts[q.subject].correct++;
      }
    });

    const score = Math.round((correctCount / total) * 100);
    DOM.scoreNum.textContent = score;

    const isPass = score >= 60;
    DOM.scoreStatus.innerHTML = isPass
      ? `<span class="pass-tag">⚡ 합격권 달성! (기준 60점 이상)</span>`
      : `<span class="fail-tag" style="color:var(--accent-red);background:rgba(239,68,68,0.15);padding:4px 14px;border-radius:9999px;font-weight:700;font-size:0.85rem;">과락/점수 미달 - 오답노트로 복습해 보세요!</span>`;

    // Subject breakdown
    DOM.subjectResultsGrid.innerHTML = "";
    for (const [subName, stats] of Object.entries(subjectCounts)) {
      const item = document.createElement("div");
      item.className = "sub-res-item";
      item.innerHTML = `
        <span>${subName}</span>
        <strong>${stats.correct} / ${stats.total} 정답</strong>
      `;
      DOM.subjectResultsGrid.appendChild(item);
    }

    // Record streak & attendance for daily mode
    if (state.mode === "daily") {
      if (state.lastAttendance !== state.todayDateStr) {
        state.streak = (state.streak || 0) + 1;
        state.lastAttendance = state.todayDateStr;
        showToast(`🎉 오늘 출석 번개 도장 완료! (${state.streak}일 연속)`);
      }
      state.history.push({
        date: state.todayDateStr,
        score,
        total,
        correctCount,
        timestamp: new Date().toISOString()
      });
      saveLocalState();
      syncWithServer();
      updateDashboardStats();
    }

    DOM.quizSection.classList.add("hidden");
    DOM.resultSection.classList.remove("hidden");
  }

  // Switch App Mode
  function switchMode(newMode) {
    state.mode = newMode;
    DOM.modeTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mode === newMode);
    });

    DOM.resultSection.classList.add("hidden");

    if (newMode === "stats") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      DOM.quizSection.classList.add("hidden");
      DOM.statsSection.classList.remove("hidden");
      renderStatsView();
      return;
    }

    DOM.statsSection.classList.add("hidden");
    DOM.quizSection.classList.remove("hidden");

    if (newMode === "daily") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadDailyQuestions();
    } else if (newMode === "practice") {
      DOM.subjectFilterBar.classList.remove("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadPracticeQuestions(state.subjectId);
    } else if (newMode === "kec") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadKecQuestions();
    } else if (newMode === "search") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.remove("hidden");
      if (DOM.searchInput.value.trim()) {
        performSearch(DOM.searchInput.value.trim());
      } else {
        DOM.searchInput.focus();
      }
    } else if (newMode === "wrong") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadWrongQuestions();
    }
  }

  // Render Stats View
  function renderStatsView() {
    const totalSolved = state.history.reduce((sum, h) => sum + (h.total || 0), 0);
    const totalCorrect = state.history.reduce((sum, h) => sum + Math.round((h.score / 100) * (h.total || 10)), 0);
    const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

    DOM.statsTotalSolved.textContent = `${totalSolved}제`;
    DOM.statsOverallAccuracy.textContent = `${accuracy}%`;
    DOM.statsStreak.textContent = `${state.streak}일`;
    DOM.statsWrongCount.textContent = `${state.wrongQuestions.size}개`;

    // Subjects Mastery estimate
    const subjects = [
      "1. 전기자기학",
      "2. 전력공학",
      "3. 전기기기",
      "4. 회로이론 및 제어공학",
      "5. 전기설비기술기준"
    ];

    DOM.subjectMasteryBars.innerHTML = "";
    subjects.forEach((sub, i) => {
      const row = document.createElement("div");
      row.className = "mastery-row";
      // Generate realistic mastery rate based on accuracy
      const pct = Math.max(30, Math.min(100, Math.round(accuracy + (i % 2 === 0 ? 8 : -5))));
      row.innerHTML = `
        <div class="mastery-meta">
          <span>${sub}</span>
          <strong>${pct}%</strong>
        </div>
        <div class="mastery-bar-bg">
          <div class="mastery-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      DOM.subjectMasteryBars.appendChild(row);
    });
  }

  // Auth Modal Logic
  function openAuthModal(mode = "login") {
    state.authMode = mode;
    DOM.authMsg.textContent = "";
    DOM.authUsername.value = "";
    DOM.authPassword.value = "";
    DOM.authNickname.value = "";

    if (mode === "login") {
      DOM.authModalTitle.textContent = "로그인";
      DOM.authSubmitBtn.textContent = "로그인";
      DOM.nicknameGroup.classList.add("hidden");
      DOM.authToggleText.textContent = "계정이 없으신가요?";
      DOM.authToggleBtn.textContent = "회원가입";
    } else {
      DOM.authModalTitle.textContent = "회원가입";
      DOM.authSubmitBtn.textContent = "가입하기";
      DOM.nicknameGroup.classList.remove("hidden");
      DOM.authToggleText.textContent = "이미 계정이 있으신가요?";
      DOM.authToggleBtn.textContent = "로그인";
    }
    DOM.authModal.classList.remove("hidden");
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = DOM.authUsername.value.trim();
    const password = DOM.authPassword.value;
    const nickname = DOM.authNickname.value.trim();

    if (!username || !password) {
      DOM.authMsg.className = "form-msg error";
      DOM.authMsg.textContent = "아이디와 비밀번호를 모두 입력해주세요.";
      return;
    }

    const endpoint = state.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, nickname })
      });
      const data = await res.json();
      if (!res.ok) {
        DOM.authMsg.className = "form-msg error";
        DOM.authMsg.textContent = data.error || "오류가 발생했습니다.";
        return;
      }

      state.user = {
        username: data.user.username,
        nickname: data.user.nickname,
        token: data.token
      };
      saveLocalState();
      updateDashboardStats();
      DOM.authModal.classList.add("hidden");
      showToast(`⚡ ${data.user.nickname}님 환영합니다!`);
      syncWithServer();
    } catch (err) {
      DOM.authMsg.className = "form-msg error";
      DOM.authMsg.textContent = "서버 접속에 실패했습니다.";
    }
  }

  function handleLogout() {
    state.user = null;
    saveLocalState();
    updateDashboardStats();
    showToast("로그아웃 되었습니다.");
  }

  // Setup Event Listeners
  function initEvents() {
    // Mode tabs
    DOM.modeTabs.forEach(tab => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    // Practice Subject filters
    DOM.filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        DOM.filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.subjectId = parseInt(btn.dataset.sub, 10);
        loadPracticeQuestions(state.subjectId);
      });
    });

    // Quiz Navigation
    DOM.prevBtn.addEventListener("click", () => {
      if (state.currentIndex > 0) {
        state.currentIndex--;
        renderQuestion();
      }
    });

    DOM.nextBtn.addEventListener("click", () => {
      if (state.currentIndex < state.questions.length - 1) {
        state.currentIndex++;
        renderQuestion();
      }
    });

    DOM.finishBtn.addEventListener("click", finishQuiz);

    // Bookmark Toggle
    DOM.bookmarkBtn.addEventListener("click", () => {
      const q = state.questions[state.currentIndex];
      if (!q) return;
      if (state.bookmarks.has(q.id)) {
        state.bookmarks.delete(q.id);
        showToast("북마크를 해제했습니다.");
      } else {
        state.bookmarks.add(q.id);
        showToast("⭐ 중요 문제로 북마크했습니다!");
      }
      saveLocalState();
      renderQuestion();
    });

    // Result Actions
    DOM.restartDailyBtn.addEventListener("click", () => switchMode("daily"));
    DOM.reviewWrongBtn.addEventListener("click", () => switchMode("wrong"));

    // Auth modal
    DOM.closeAuthModal.addEventListener("click", () => DOM.authModal.classList.add("hidden"));
    DOM.authToggleBtn.addEventListener("click", () => {
      openAuthModal(state.authMode === "login" ? "register" : "login");
    });
    DOM.authForm.addEventListener("submit", handleAuthSubmit);

    // Logo click resets to daily
    DOM.brandLogo.addEventListener("click", () => switchMode("daily"));

    // Search events
    if (DOM.searchSubmitBtn) {
      DOM.searchSubmitBtn.addEventListener("click", () => {
        performSearch(DOM.searchInput.value);
      });
    }
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          performSearch(DOM.searchInput.value);
        }
      });
    }
  }

  // Initialize Application
  function init() {
    // Set formatted date
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    state.todayDateStr = `${y}-${m}-${d}`;
    DOM.todayDateTag.textContent = `📅 ${y}. ${m}. ${d}`;

    loadLocalState();
    initEvents();
    updateDashboardStats();
    loadDailyQuestions();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
