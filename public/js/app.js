/**
 * 하루전기 (Haru Elec) - Frontend Application Core (v2.1.0)
 */

(function () {
  "use strict";

  const CURRENT_APP_VERSION = "3.2.0";

  // KST Date Helper
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

  // Dynamic Array Shuffle (Fisher-Yates)
  function shuffleArray(arr) {
    if (!Array.isArray(arr)) return [];
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Dynamic Option Shuffle (Fisher-Yates) to eliminate answer position bias
  function shuffleQuestionOptions(q) {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
    const originalAnswerText = q.options[q.answer - 1];
    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const newAnswerIndex = shuffled.indexOf(originalAnswerText) + 1; // 1-based index (1~4)
    return {
      ...q,
      options: shuffled,
      answer: newAnswerIndex
    };
  }

  // Unsolved-First Question Selection Engine
  function selectUnsolvedFirstQuestions(pool, count = 10, solvedSet = state.solvedQuestionIds) {
    if (!pool || pool.length === 0) return [];
    if (pool.length <= count) return shuffleArray(pool);

    const solved = solvedSet instanceof Set ? solvedSet : new Set(solvedSet || []);
    const unseenPool = pool.filter(q => !solved.has(q.id));
    const seenPool = pool.filter(q => solved.has(q.id));

    let selected = [];

    if (unseenPool.length >= count) {
      const shuffledUnseen = shuffleArray(unseenPool);
      selected = shuffledUnseen.slice(0, count);
    } else if (unseenPool.length > 0) {
      const shuffledUnseen = shuffleArray(unseenPool);
      const shuffledSeen = shuffleArray(seenPool);
      const neededFromSeen = count - shuffledUnseen.length;
      selected = [...shuffledUnseen, ...shuffledSeen.slice(0, neededFromSeen)];
    } else {
      // Entire pool has been exhausted: cycle reset
      pool.forEach(q => solved.delete(q.id));
      const shuffledAll = shuffleArray(pool);
      selected = shuffledAll.slice(0, count);
    }

    return shuffleArray(selected);
  }

  // State
  const state = {
    mode: "daily", // daily | practice | kec | search | leaderboard | wrong | stats
    subjectId: 0,
    currentRound: 1,
    questions: [],
    currentIndex: 0,
    userAnswers: {}, // { [qId]: selectedOption (1~4) }
    wrongQuestions: new Set(),
    bookmarks: new Set(),
    history: [],
    streak: 0,
    totalPoints: 0,
    todayScore: 0,
    maxRoundToday: 1,
    lastAttendance: "",
    user: null, // { username, nickname, token }
    todayDateStr: getKSTDateString(),
    lastLoadedDate: getKSTDateString(),
    authMode: "login", // login | register

    // v2.1.0 & v3.0.0 Gamification, Dual-Track & Multitasking State
    examTrack: "written", // written | practical
    selectedLevel: 1, // 1:입문/기초 ~ 5:고난도/실무
    maxRoundWritten: 1,
    maxRoundPractical: 1,
    solvedQuestionIds: new Set(),
    shieldCount: 0,
    consecutivePerfectRounds: 0,
    items: {
      eraser5050: 2,
      heart: 2,
      booster2x: 2,
      hint: 2,
      clover: 1,
      timemachine: 1,
      magnet: 1
    },
    pointMultiplier: 1,
    activeItemHeart: false,
    activeItemMagnet: false,
    activeItem5050Indices: [],
    lastSelectedWrongOption: null,
    qnetSchedule: null,

    // v3.1.0 PWA & Member Messaging State
    deferredPwaPrompt: null,
    currentRecipient: null,
    inboxFilter: "all",
    unreadMessagesCount: 0,
    lastSeenMessageId: null,

    // v3.2.0 Deep-Dive Subject & Chapter Filter State
    selectedSubjectId: 0,
    selectedSubSubject: "", // e.g. "회로이론", "제어공학"
    selectedChapterId: 0,
    selectedWrongSubjectId: 0,
    selectedWrongChapterId: 0,
    chapterRegistry: null,
    inboxMessages: []
  };

  function recordQuestionSolved(qId) {
    if (!qId) return;
    state.solvedQuestionIds.add(qId);
  }

  // Sound Synth via Web Audio API with Mobile First-Touch Unlock
  const sound = {
    ctx: null,
    init() {
      if (!this.ctx && typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
      }
    },
    unlockAudio() {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      } else if (!this.ctx) {
        this.init();
      }
    },
    playTone(freq, duration, type = "sine", delay = 0) {
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {});
        }
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
    },
    messageChime() {
      this.playTone(587.33, 0.12, "sine", 0);     // D5
      this.playTone(880.00, 0.25, "sine", 0.1);   // A5
    }
  };

  // Safe DOM Selectors for Browser & Node Testing
  const $ = (id) => (typeof document !== "undefined" ? document.getElementById(id) : null);
  const $$ = (sel) => (typeof document !== "undefined" ? Array.from(document.querySelectorAll(sel)) : []);

  const DOM = {
    get streakBadge() { return $("streakBadge"); },
    get streakCount() { return $("streakCount"); },
    get userMenu() { return $("userMenu"); },
    get authBtn() { return $("authBtn"); },
    get todayDateTag() { return $("todayDateTag"); },
    get summaryGreeting() { return $("summaryGreeting"); },
    get statTodayStatus() { return $("statTodayStatus"); },
    get statTotalSolved() { return $("statTotalSolved"); },
    get statAccuracy() { return $("statAccuracy"); },
    get modeTabs() { return $$(".mode-tab"); },
    get wrongBadge() { return $("wrongBadge"); },
    get subjectFilterBar() { return $("subjectFilterBar"); },
    get filterBtns() { return $$(".filter-btn"); },
    get practiceSubjectButtons() { return $$("#practiceSubjectButtons .filter-btn"); },
    get subSubjectRow() { return $("subSubjectRow"); },
    get subSubjectChips() { return $$("#subSubjectChips .sub-chip"); },
    get chapterFilterRow() { return $("chapterFilterRow"); },
    get chapterChipsList() { return $("chapterChipsList"); },
    get wrongFilterBar() { return $("wrongFilterBar"); },
    get wrongSubjectButtons() { return $("wrongSubjectButtons"); },
    get wrongChapterRow() { return $("wrongChapterRow"); },
    get wrongChapterChipsList() { return $("wrongChapterChipsList"); },
    get quizSection() { return $("quizSection"); },
    get resultSection() { return $("resultSection"); },
    get statsSection() { return $("statsSection"); },
    get currentSubjectTag() { return $("currentSubjectTag"); },
    get questionProgressText() { return $("questionProgressText"); },
    get progressBarFill() { return $("progressBarFill"); },
    get bookmarkBtn() { return $("bookmarkBtn"); },
    get questionYear() { return $("questionYear"); },
    get questionSource() { return $("questionSource"); },
    get questionKecBadge() { return $("questionKecBadge"); },
    get kecDiffCard() { return $("kecDiffCard"); },
    get kecDiffTopic() { return $("kecDiffTopic"); },
    get kecDiffBefore() { return $("kecDiffBefore"); },
    get kecDiffAfter() { return $("kecDiffAfter"); },
    get searchBarWrap() { return $("searchBarWrap"); },
    get searchInput() { return $("searchInput"); },
    get searchSubmitBtn() { return $("searchSubmitBtn"); },
    get searchInfoText() { return $("searchInfoText"); },
    get questionText() { return $("questionText"); },
    get optionsList() { return $("optionsList"); },
    get explanationBox() { return $("explanationBox"); },
    get explanationContent() { return $("explanationContent"); },
    get prevBtn() { return $("prevBtn"); },
    get nextBtn() { return $("nextBtn"); },
    get finishBtn() { return $("finishBtn"); },
    get resultStamp() { return $("resultStamp"); },
    get resultTitle() { return $("resultTitle"); },
    get resultSubtitle() { return $("resultSubtitle"); },
    get scoreNum() { return $("scoreNum"); },
    get scoreStatus() { return $("scoreStatus"); },
    get subjectResultsGrid() { return $("subjectResultsGrid"); },
    get reviewWrongBtn() { return $("reviewWrongBtn"); },
    get restartDailyBtn() { return $("restartDailyBtn"); },
    get statsTotalSolved() { return $("statsTotalSolved"); },
    get statsOverallAccuracy() { return $("statsOverallAccuracy"); },
    get statsStreak() { return $("statsStreak"); },
    get statsWrongCount() { return $("statsWrongCount"); },
    get subjectMasteryBars() { return $("subjectMasteryBars"); },
    get authModal() { return $("authModal"); },
    get closeAuthModal() { return $("closeAuthModal"); },
    get authForm() { return $("authForm"); },
    get authModalTitle() { return $("authModalTitle"); },
    get authUsername() { return $("authUsername"); },
    get authPassword() { return $("authPassword"); },
    get nicknameGroup() { return $("nicknameGroup"); },
    get authNickname() { return $("authNickname"); },
    get authSubmitBtn() { return $("authSubmitBtn"); },
    get authToggleBtn() { return $("authToggleBtn"); },
    get authToggleText() { return $("authToggleText"); },
    get authMsg() { return $("authMsg"); },
    get appToast() { return $("appToast"); },
    get brandLogo() { return $("brandLogo"); },

    // v2.1.0 New DOM Elements
    get shieldBadge() { return $("shieldBadge"); },
    get shieldCount() { return $("shieldCount"); },
    get btnReloadPage() { return $("btnReloadPage"); },
    get gameGuideBtn() { return $("gameGuideBtn"); },
    get gameGuideModal() { return $("gameGuideModal"); },
    get closeGameGuideModal() { return $("closeGameGuideModal"); },
    get resumeQuizBanner() { return $("resumeQuizBanner"); },
    get btnResumeQuiz() { return $("btnResumeQuiz"); },
    get btnDismissResume() { return $("btnDismissResume"); },
    get quizItemBar() { return $("quizItemBar"); },
    get activeItemBanner() { return $("activeItemBanner"); },
    get item5050Count() { return $("item5050Count"); },
    get itemHeartCount() { return $("itemHeartCount"); },
    get item2xCount() { return $("item2xCount"); },
    get btnItem5050() { return $("btnItem5050"); },
    get btnItemHeart() { return $("btnItemHeart"); },
    get btnItem2x() { return $("btnItem2x"); },
    get itemHintCount() { return $("itemHintCount"); },
    get itemCloverCount() { return $("itemCloverCount"); },
    get itemTimemachineCount() { return $("itemTimemachineCount"); },
    get itemMagnetCount() { return $("itemMagnetCount"); },
    get btnItemHint() { return $("btnItemHint"); },
    get btnItemClover() { return $("btnItemClover"); },
    get btnItemTimemachine() { return $("btnItemTimemachine"); },
    get btnItemMagnet() { return $("btnItemMagnet"); },

    get quizHintBox() { return $("quizHintBox"); },
    get btnCloseHint() { return $("btnCloseHint"); },
    get quizHintText() { return $("quizHintText"); },

    get modalLuckyBox() { return $("modalLuckyBox"); },
    get btnOpenLuckyBox() { return $("btnOpenLuckyBox"); },
    get btnCloseLuckyBox() { return $("btnCloseLuckyBox"); },
    get luckyBoxRewardArea() { return $("luckyBoxRewardArea"); },
    get luckyRewardEmoji() { return $("luckyRewardEmoji"); },
    get luckyRewardName() { return $("luckyRewardName"); },
    get luckyRewardDesc() { return $("luckyRewardDesc"); },

    get examTrackToggleBar() { return $("examTrackToggleBar"); },
    get btnTrackWritten() { return $("btnTrackWritten"); },
    get btnTrackPractical() { return $("btnTrackPractical"); },
    get qnetDDayCard() { return $("qnetDDayCard"); },
    get ddaySessionText() { return $("ddaySessionText"); },
    get ddayWrittenVal() { return $("ddayWrittenVal"); },
    get ddayPracticalVal() { return $("ddayPracticalVal"); },
    get btnOpenQNetModal() { return $("btnOpenQNetModal"); },
    get modalQNetSchedule() { return $("modalQNetSchedule"); },
    get closeQNetModal() { return $("closeQNetModal"); },
    get qnetScheduleListContainer() { return $("qnetScheduleListContainer"); },

    get tabModeLevel() { return $("tabModeLevel"); },
    get modalLevelSelect() { return $("modalLevelSelect"); },
    get btnCloseLevelModal() { return $("btnCloseLevelModal"); },
    get levelOptCards() { return $$(".level-opt-card"); },

    get leaderboardTabs() { return $("leaderboardTabs"); },
    get lbTabWritten() { return $("lbTabWritten"); },
    get lbTabPractical() { return $("lbTabPractical"); },
    get lbRoundColHeader() { return $("lbRoundColHeader"); },

    get shieldDecisionBox() { return $("shieldDecisionBox"); },
    get shieldDecisionCount() { return $("shieldDecisionCount"); },
    get btnUseShieldDefense() { return $("btnUseShieldDefense"); },
    get btnDeclineShield() { return $("btnDeclineShield"); },

    // v3.1.0 PWA & Member Messaging
    get btnPwaInstall() { return $("btnPwaInstall"); },
    get btnInbox() { return $("btnInbox"); },
    get inboxUnreadBadge() { return $("inboxUnreadBadge"); },
    get modalPwaGuide() { return $("modalPwaGuide"); },
    get btnClosePwaGuide() { return $("btnClosePwaGuide"); },
    get tabPwaAndroid() { return $("tabPwaAndroid"); },
    get tabPwaIos() { return $("tabPwaIos"); },
    get panelPwaAndroid() { return $("panelPwaAndroid"); },
    get panelPwaIos() { return $("panelPwaIos"); },
    get btnPwaPromptTrigger() { return $("btnPwaPromptTrigger"); },
    get modalSendMessage() { return $("modalSendMessage"); },
    get btnCloseSendMsg() { return $("btnCloseSendMsg"); },
    get btnCancelSendMsg() { return $("btnCancelSendMsg"); },
    get msgRecipientName() { return $("msgRecipientName"); },
    get msgContentInput() { return $("msgContentInput"); },
    get msgCharCount() { return $("msgCharCount"); },
    get btnSendMsgSubmit() { return $("btnSendMsgSubmit"); },
    get cheerChips() { return $$(".btn-cheer-chip"); },
    get modalInbox() { return $("modalInbox"); },
    get btnCloseInbox() { return $("btnCloseInbox"); },
    get tabInboxAll() { return $("tabInboxAll"); },
    get tabInboxReceived() { return $("tabInboxReceived"); },
    get tabInboxSent() { return $("tabInboxSent"); },
    get btnInboxMarkAllRead() { return $("btnInboxMarkAllRead"); },
    get btnInboxNewMsg() { return $("btnInboxNewMsg"); },
    get btnTogglePush() { return $("btnTogglePush"); },
    get inboxMessageList() { return $("inboxMessageList"); },
    get modalIncomingMessage() { return $("modalIncomingMessage"); },
    get incomingSenderName() { return $("incomingSenderName"); },
    get incomingContentBox() { return $("incomingContentBox"); },
    get btnReplyIncoming() { return $("btnReplyIncoming"); },
    get btnCloseIncoming() { return $("btnCloseIncoming"); }
  };

  // Toast Helper
  function showToast(msg, duration = 2500) {
    if (DOM.appToast) {
      DOM.appToast.textContent = msg;
      DOM.appToast.classList.remove("hidden");
      setTimeout(() => {
        if (DOM.appToast) DOM.appToast.classList.add("hidden");
      }, duration);
    }
  }

  // Render Math with KaTeX
  function renderMath(element) {
    if (typeof window !== "undefined" && window.renderMathInElement && element) {
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
      if (typeof localStorage === "undefined") return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.wrongQuestions) state.wrongQuestions = new Set(data.wrongQuestions);
        if (data.bookmarks) state.bookmarks = new Set(data.bookmarks);
        if (data.history) state.history = data.history;
        if (data.streak) state.streak = data.streak;
        if (data.lastAttendance) state.lastAttendance = data.lastAttendance;
        if (typeof data.totalPoints === "number") state.totalPoints = data.totalPoints;
        if (typeof data.todayScore === "number") state.todayScore = data.todayScore;
        if (typeof data.maxRoundToday === "number") state.maxRoundToday = data.maxRoundToday;
        if (data.solvedQuestionIds) state.solvedQuestionIds = new Set(data.solvedQuestionIds);
        if (typeof data.shieldCount === "number") state.shieldCount = Math.min(2, Math.max(0, data.shieldCount));
        if (typeof data.consecutivePerfectRounds === "number") state.consecutivePerfectRounds = data.consecutivePerfectRounds;
        if (data.items) state.items = { ...state.items, ...data.items };
        if (data.user) state.user = data.user;
      }
    } catch (e) {
      console.warn("Failed to load local storage:", e);
    }
  }

  function saveLocalState() {
    try {
      if (typeof localStorage === "undefined") return;
      const data = {
        wrongQuestions: Array.from(state.wrongQuestions),
        bookmarks: Array.from(state.bookmarks),
        history: state.history,
        streak: state.streak,
        lastAttendance: state.lastAttendance,
        totalPoints: state.totalPoints || 0,
        todayScore: state.todayScore || 0,
        maxRoundToday: state.maxRoundToday || 1,
        solvedQuestionIds: Array.from(state.solvedQuestionIds),
        shieldCount: Math.min(2, Math.max(0, state.shieldCount || 0)),
        consecutivePerfectRounds: state.consecutivePerfectRounds || 0,
        items: state.items || { eraser5050: 2, heart: 2, booster2x: 2 },
        user: state.user
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to save local storage:", e);
    }
  }

  // Active Quiz Session Persistence & Mobile Multitasking Resume
  function saveActiveQuizSession(customState = state) {
    if (!customState || !customState.questions || customState.questions.length === 0) {
      return false;
    }
    const session = {
      date: customState.todayDateStr || getKSTDateString(),
      mode: customState.mode || "daily",
      subjectId: customState.subjectId || 0,
      currentRound: customState.currentRound || 1,
      currentIndex: customState.currentIndex || 0,
      questions: customState.questions,
      userAnswers: customState.userAnswers || {},
      shieldCount: customState.shieldCount || 0,
      items: customState.items || { eraser5050: 2, heart: 2, booster2x: 2 },
      pointMultiplier: customState.pointMultiplier || 1,
      activeItemHeart: !!customState.activeItemHeart,
      savedAt: Date.now()
    };
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("haruelec_active_quiz_session", JSON.stringify(session));
        return true;
      }
    } catch (e) {
      console.warn("[Session] Failed to save active quiz session", e);
    }
    return false;
  }

  function clearActiveQuizSession() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("haruelec_active_quiz_session");
      }
    } catch (e) {}
    const resumeBanner = DOM.resumeQuizBanner;
    if (resumeBanner) resumeBanner.classList.add("hidden");
  }

  function restoreActiveQuizSession(targetState = state) {
    try {
      if (typeof localStorage === "undefined") return false;
      const raw = localStorage.getItem("haruelec_active_quiz_session");
      if (!raw) return false;
      const session = JSON.parse(raw);
      const today = (targetState && targetState.todayDateStr) || getKSTDateString();

      // Expire on date transition
      if (session.date !== today) {
        clearActiveQuizSession();
        return false;
      }

      if (!session.questions || !Array.isArray(session.questions) || session.questions.length === 0) {
        clearActiveQuizSession();
        return false;
      }

      targetState.mode = session.mode || "daily";
      targetState.subjectId = session.subjectId || 0;
      targetState.currentRound = session.currentRound || 1;
      targetState.currentIndex = session.currentIndex || 0;
      targetState.questions = session.questions;
      targetState.userAnswers = session.userAnswers || {};
      targetState.shieldCount = session.shieldCount || 0;
      if (session.items) targetState.items = session.items;
      targetState.pointMultiplier = session.pointMultiplier || 1;
      targetState.activeItemHeart = !!session.activeItemHeart;

      return true;
    } catch (e) {
      console.warn("[Session] Failed to restore active quiz session", e);
      return false;
    }
  }

  function updateResumeQuizBanner() {
    const banner = DOM.resumeQuizBanner;
    if (!banner) return;
    try {
      if (typeof localStorage === "undefined") {
        banner.classList.add("hidden");
        return;
      }
      const raw = localStorage.getItem("haruelec_active_quiz_session");
      if (!raw) {
        banner.classList.add("hidden");
        return;
      }
      const session = JSON.parse(raw);
      if (session.date !== getKSTDateString() || !session.questions || session.questions.length === 0) {
        banner.classList.add("hidden");
        return;
      }
      const answeredCount = Object.keys(session.userAnswers || {}).length;
      if (answeredCount >= session.questions.length) {
        banner.classList.add("hidden");
        return;
      }

      const infoEl = document.getElementById("resumeBannerInfo");
      if (infoEl) {
        infoEl.textContent = `라운드 ${session.currentRound || 1} (진행률: ${answeredCount}/${session.questions.length})`;
      }
      banner.classList.remove("hidden");
    } catch (e) {
      banner.classList.add("hidden");
    }
  }

  // Gamification Mechanics
  function awardShieldForConsecutivePerfect(targetState = state, score = 100) {
    if (score === 100) {
      targetState.consecutivePerfectRounds = (targetState.consecutivePerfectRounds || 0) + 1;
      let shieldAwarded = false;
      let bonusPoints = 0;

      if (targetState.consecutivePerfectRounds % 2 === 0) {
        const prevShields = targetState.shieldCount || 0;
        targetState.shieldCount = Math.min(2, prevShields + 1);
        shieldAwarded = targetState.shieldCount > prevShields;
      }

      if (targetState.consecutivePerfectRounds === 3) {
        bonusPoints = 300;
        targetState.totalPoints = (targetState.totalPoints || 0) + bonusPoints;
        targetState.todayScore = (targetState.todayScore || 0) + bonusPoints;
      }

      return {
        consecutivePerfectRounds: targetState.consecutivePerfectRounds,
        shieldAwarded,
        shieldCount: targetState.shieldCount,
        bonusPoints
      };
    } else {
      targetState.consecutivePerfectRounds = 0;
      return {
        consecutivePerfectRounds: 0,
        shieldAwarded: false,
        shieldCount: targetState.shieldCount || 0,
        bonusPoints: 0
      };
    }
  }

  function processShieldDecision(targetState = state, choice = "USE_SHIELD") {
    if (!targetState.shieldCount || targetState.shieldCount <= 0) {
      return { status: "NO_SHIELD_AVAILABLE", currentRound: targetState.currentRound, remainingShields: 0 };
    }

    if (choice === "USE_SHIELD") {
      targetState.shieldCount = Math.max(0, targetState.shieldCount - 1);
      const nextRound = (targetState.currentRound || 1) + 1;
      return {
        status: "CLEARED_BY_SHIELD",
        nextRound,
        remainingShields: targetState.shieldCount
      };
    } else {
      return {
        status: "FAILED_SAVED_SHIELD",
        fallbackRound: targetState.currentRound || 1,
        remainingShields: targetState.shieldCount
      };
    }
  }

  function useItem5050Logic(question, targetState = state) {
    if (!targetState.items || targetState.items.eraser5050 <= 0) return [];
    if (!question || !Array.isArray(question.options) || question.options.length < 2) return [];

    const correctAnswer = question.answer; // 1-based index (1~4)
    const wrongIndices = [];
    for (let i = 1; i <= question.options.length; i++) {
      if (i !== correctAnswer) wrongIndices.push(i);
    }
    wrongIndices.sort(() => 0.5 - Math.random());
    const toDisable = wrongIndices.slice(0, 2);

    targetState.items.eraser5050 = Math.max(0, targetState.items.eraser5050 - 1);
    return toDisable;
  }

  function useItemHeartLogic(targetState = state) {
    if (!targetState.items || targetState.items.heart <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    if (targetState.activeItemHeart) {
      return { success: false, reason: "ALREADY_ACTIVE" };
    }
    targetState.items.heart = Math.max(0, targetState.items.heart - 1);
    targetState.activeItemHeart = true;
    return { success: true, remaining: targetState.items.heart };
  }

  function useItem2xLogic(targetState = state) {
    if (!targetState.items || targetState.items.booster2x <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    if (targetState.pointMultiplier === 2) {
      return { success: false, reason: "ALREADY_ACTIVE" };
    }
    targetState.items.booster2x = Math.max(0, targetState.items.booster2x - 1);
    targetState.pointMultiplier = 2;
    return { success: true, remaining: targetState.items.booster2x };
  }

  function useItemHintLogic(question, targetState = state) {
    if (!targetState.items || targetState.items.hint <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    targetState.items.hint = Math.max(0, targetState.items.hint - 1);
    const hintText = question?.hint || (question?.explanation ? question.explanation.slice(0, 120) + "..." : "핵심 공식 및 원리를 적용하세요.");
    return { success: true, hint: hintText, remaining: targetState.items.hint };
  }

  function useItemCloverLogic(question, targetState = state) {
    if (!targetState.items || targetState.items.clover <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    if (!question) return { success: false, reason: "NO_QUESTION" };
    targetState.items.clover = Math.max(0, targetState.items.clover - 1);
    targetState.userAnswers[question.id] = question.answer;
    return { success: true, answer: question.answer, remaining: targetState.items.clover };
  }

  function useItemTimemachineLogic(question, targetState = state) {
    if (!targetState.items || targetState.items.timemachine <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    if (!question) return { success: false, reason: "NO_QUESTION" };
    targetState.items.timemachine = Math.max(0, targetState.items.timemachine - 1);
    delete targetState.userAnswers[question.id];
    targetState.lastSelectedWrongOption = null;
    return { success: true, remaining: targetState.items.timemachine };
  }

  function useItemMagnetLogic(targetState = state) {
    if (!targetState.items || targetState.items.magnet <= 0) {
      return { success: false, reason: "NO_ITEM" };
    }
    if (targetState.activeItemMagnet) {
      return { success: false, reason: "ALREADY_ACTIVE" };
    }
    targetState.items.magnet = Math.max(0, targetState.items.magnet - 1);
    targetState.activeItemMagnet = true;
    return { success: true, remaining: targetState.items.magnet };
  }

  // 럭키 박스 8종 보상 풀
  const LUCKY_BOX_REWARDS = [
    { key: "eraser5050", type: "item", emoji: "⚡", name: "50:50 차단기 (+1)" },
    { key: "heart", type: "item", emoji: "💖", name: "비상 발전기 (+1)" },
    { key: "booster2x", type: "item", emoji: "🚀", name: "2배 승압기 (+1)" },
    { key: "hint", type: "item", emoji: "🔍", name: "공식 계측기 (+1)" },
    { key: "clover", type: "item", emoji: "🍀", name: "통전 클로버 (+1)" },
    { key: "timemachine", type: "item", emoji: "⌛", name: "리셋 스위치 (+1)" },
    { key: "magnet", type: "item", emoji: "🧲", name: "전자석 콤보 (+1)" },
    { key: "shield", type: "shield", emoji: "🛡️", name: "안전 방패 (+1)" },
    { key: "bonus_points", type: "points", emoji: "💰", name: "보너스 전기 포인트 (+100P)" }
  ];

  function rollLuckyBoxReward(targetState = state) {
    const pick = LUCKY_BOX_REWARDS[Math.floor(Math.random() * LUCKY_BOX_REWARDS.length)];
    if (pick.type === "shield") {
      if (targetState.shieldCount >= 2) {
        // 이미 방패가 최대(2개)면 포인트로 대체 지급
        targetState.totalPoints = (targetState.totalPoints || 0) + 100;
        return {
          emoji: "💰",
          name: "보너스 전기 포인트 (+100P)",
          desc: "이미 방패를 최대 2개 보유 중이어서 +100P로 대체 지급되었습니다!"
        };
      } else {
        targetState.shieldCount = Math.min(2, (targetState.shieldCount || 0) + 1);
        return {
          emoji: "🛡️",
          name: "안전 방패 (+1)",
          desc: "연속 만점을 놓쳐도 다음 라운드로 진출할 수 있는 방패가 충전되었습니다!"
        };
      }
    } else if (pick.type === "points") {
      targetState.totalPoints = (targetState.totalPoints || 0) + 100;
      return {
        emoji: "💰",
        name: "보너스 전기 포인트 (+100P)",
        desc: "지갑에 100P가 쏙 들어왔습니다!"
      };
    } else {
      // 7종 아이템 중 1개 증가
      if (!targetState.items) targetState.items = {};
      targetState.items[pick.key] = (targetState.items[pick.key] || 0) + 1;
      return {
        emoji: pick.emoji,
        name: pick.name,
        desc: "인게임 찬스 가방에 아이템이 추가되었습니다!"
      };
    }
  }

  // Version Check Helpers
  function isServerVersionNewer(serverVer, clientVer = CURRENT_APP_VERSION) {
    if (!serverVer || typeof serverVer !== "string") return false;
    if (!clientVer || typeof clientVer !== "string") return false;

    const sParts = serverVer.split(".").map(n => parseInt(n, 10) || 0);
    const cParts = clientVer.split(".").map(n => parseInt(n, 10) || 0);

    const len = Math.max(sParts.length, cParts.length);
    for (let i = 0; i < len; i++) {
      const s = sParts[i] || 0;
      const c = cParts[i] || 0;
      if (s > c) return true;
      if (s < c) return false;
    }
    return false;
  }

  let lastVersionCheckTime = 0;
  async function checkAppVersionUpdate(force = false) {
    const now = Date.now();
    if (!force && now - lastVersionCheckTime < 15000) {
      return; // debounce 15s
    }
    lastVersionCheckTime = now;

    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const serverVersion = data.version;

      if (isServerVersionNewer(serverVersion, CURRENT_APP_VERSION)) {
        console.log(`[Version] Newer version detected: ${CURRENT_APP_VERSION} -> ${serverVersion}`);
        saveActiveQuizSession();

        try {
          if (typeof sessionStorage !== "undefined") {
            const lastReload = parseInt(sessionStorage.getItem("haruelec_last_version_reload") || "0", 10);
            if (now - lastReload < 60000) {
              console.warn("[Version] Reload guard triggered, suppressing reload loop.");
              return;
            }
            sessionStorage.setItem("haruelec_last_version_reload", String(now));
          }
        } catch (e) {}

        if (typeof window !== "undefined" && window.caches) {
          try {
            const keys = await window.caches.keys();
            await Promise.all(keys.map(k => window.caches.delete(k)));
          } catch (e) {}
        }

        if (typeof window !== "undefined" && window.location) {
          window.location.reload(true);
        }
      }
    } catch (e) {
      console.warn("[Version] Version check failed", e);
    }
  }

  // UI Updates for Items and Shields
  function updateItemUI() {
    if (DOM.item5050Count) DOM.item5050Count.textContent = state.items.eraser5050 || 0;
    if (DOM.itemHeartCount) DOM.itemHeartCount.textContent = state.items.heart || 0;
    if (DOM.item2xCount) DOM.item2xCount.textContent = state.items.booster2x || 0;
    if (DOM.itemHintCount) DOM.itemHintCount.textContent = state.items.hint || 0;
    if (DOM.itemCloverCount) DOM.itemCloverCount.textContent = state.items.clover || 0;
    if (DOM.itemTimemachineCount) DOM.itemTimemachineCount.textContent = state.items.timemachine || 0;
    if (DOM.itemMagnetCount) DOM.itemMagnetCount.textContent = state.items.magnet || 0;

    if (DOM.btnItem5050) DOM.btnItem5050.disabled = (state.items.eraser5050 || 0) <= 0;
    if (DOM.btnItemHeart) DOM.btnItemHeart.disabled = (state.items.heart || 0) <= 0 || state.activeItemHeart;
    if (DOM.btnItem2x) DOM.btnItem2x.disabled = (state.items.booster2x || 0) <= 0 || state.pointMultiplier === 2;
    if (DOM.btnItemHint) DOM.btnItemHint.disabled = (state.items.hint || 0) <= 0;
    if (DOM.btnItemClover) DOM.btnItemClover.disabled = (state.items.clover || 0) <= 0;
    if (DOM.btnItemTimemachine) DOM.btnItemTimemachine.disabled = (state.items.timemachine || 0) <= 0;
    if (DOM.btnItemMagnet) DOM.btnItemMagnet.disabled = (state.items.magnet || 0) <= 0 || state.activeItemMagnet;
  }

  function updateShieldBadge() {
    if (DOM.shieldCount) {
      DOM.shieldCount.textContent = state.shieldCount || 0;
    }
  }

  function showActiveItemBanner(msg) {
    if (DOM.activeItemBanner) {
      DOM.activeItemBanner.textContent = msg;
      DOM.activeItemBanner.classList.remove("hidden");
    }
  }

  function hideActiveItemBanner() {
    if (DOM.activeItemBanner) {
      DOM.activeItemBanner.classList.add("hidden");
    }
  }

  function apply5050ToCurrentOptions(disabledIndices) {
    if (!disabledIndices || disabledIndices.length === 0) return;
    const optionElements = $$("#optionsList .option-item");
    optionElements.forEach((el, idx) => {
      const optNum = idx + 1;
      if (disabledIndices.includes(optNum)) {
        el.classList.add("disabled-option");
        el.style.opacity = "0.35";
        el.style.pointerEvents = "none";
        el.style.textDecoration = "line-through";
      }
    });
  }

  function useItem5050() {
    const q = state.questions[state.currentIndex];
    if (!q || state.userAnswers[q.id] !== undefined) return;
    if (state.activeItem5050Indices && state.activeItem5050Indices.length > 0) {
      showToast("이미 이번 문제에 50:50 아이템을 사용했습니다!");
      return;
    }
    const disabled = useItem5050Logic(q, state);
    if (disabled.length === 0) {
      showToast("남은 50:50 아이템이 없습니다!");
      return;
    }
    state.activeItem5050Indices = disabled;
    apply5050ToCurrentOptions(disabled);
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    showToast("⚡ 50:50 전력 차단! 오답 보기 2개가 비활성화되었습니다.");
  }

  function useItemHeart() {
    const res = useItemHeartLogic(state);
    if (!res.success) {
      if (res.reason === "ALREADY_ACTIVE") {
        showToast("💖 이미 절연 보호가 활성화되어 있습니다!");
      } else {
        showToast("남은 절연 보호 아이템이 없습니다!");
      }
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    showActiveItemBanner("💖 절연 보호 활성화 중: 오답 선택 시 1회 기회가 다시 주어집니다!");
    showToast("💖 절연 보호 발동! 첫 오답이 무효화됩니다.");
  }

  function useItem2x() {
    const res = useItem2xLogic(state);
    if (!res.success) {
      if (res.reason === "ALREADY_ACTIVE") {
        showToast("🚀 이미 2배 부스터가 적용 중입니다!");
      } else {
        showToast("남은 2배 부스터 아이템이 없습니다!");
      }
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    showActiveItemBanner("🚀 2배 부스터 가동: 이번 라운드 획득 포인트가 2배로 적립됩니다!");
    showToast("🚀 2배 부스터 가동! 이번 라운드 포인트 2배 적립!");
  }

  function useItemHint() {
    const q = state.questions[state.currentIndex];
    if (!q) return;
    const res = useItemHintLogic(q, state);
    if (!res.success) {
      showToast("남은 공식 계측기(힌트) 아이템이 없습니다!");
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();

    if (DOM.quizHintText) DOM.quizHintText.textContent = res.hint;
    if (DOM.quizHintBox) DOM.quizHintBox.classList.remove("hidden");
    renderMath(DOM.quizHintBox);
    showToast("🔍 공식 계측기 가동! 핵심 공식 힌트를 확인하세요.");
  }

  function useItemClover() {
    const q = state.questions[state.currentIndex];
    if (!q || state.userAnswers[q.id] !== undefined) return;
    const res = useItemCloverLogic(q, state);
    if (!res.success) {
      showToast("남은 통전 클로버 아이템이 없습니다!");
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    showToast("🍀 통전 클로버 발동! 이번 문제가 100% 정답 처리되었습니다.");
    selectOption(res.answer);
  }

  function useItemTimemachine() {
    const q = state.questions[state.currentIndex];
    if (!q) return;
    if (state.userAnswers[q.id] === undefined) {
      showToast("아직 풀지 않은 문제입니다. 오답을 골랐을 때 되돌릴 수 있습니다.");
      return;
    }
    if (state.userAnswers[q.id] === q.answer) {
      showToast("이미 정답을 맞힌 문제입니다!");
      return;
    }
    const res = useItemTimemachineLogic(q, state);
    if (!res.success) {
      showToast("남은 리셋 스위치(타임머신) 아이템이 없습니다!");
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    renderQuestion(q);
    showToast("⌛ 리셋 스위치 작동! 오답 선택이 취소되어 다시 풀 수 있습니다.");
  }

  function useItemMagnet() {
    const res = useItemMagnetLogic(state);
    if (!res.success) {
      if (res.reason === "ALREADY_ACTIVE") {
        showToast("🧲 이미 전자석 콤보가 활성화되어 있습니다!");
      } else {
        showToast("남은 전자석 콤보 아이템이 없습니다!");
      }
      return;
    }
    updateItemUI();
    saveLocalState();
    saveActiveQuizSession();
    showActiveItemBanner("🧲 전자석 콤보 가동: 연속 정답 시 콤보 가산점이 2배로 폭증합니다!");
    showToast("🧲 전자석 콤보 가동! 연속 정답 가산점 2배 적용!");
  }

  // 깜짝 보너스 럭키 박스 시스템
  let currentRolledReward = null;

  function triggerLuckyBoxRoll() {
    // 28% 확률로 깜짝 번개 상자 등장
    if (Math.random() >= 0.28) return;
    if (!DOM.modalLuckyBox) return;

    currentRolledReward = rollLuckyBoxReward(state);
    saveLocalState();
    syncWithServer("LUCKY_BOX_DROPPED", { reward: currentRolledReward.name });

    // UI 모달 리셋 및 노출
    if (DOM.luckyBoxRewardArea) DOM.luckyBoxRewardArea.classList.add("hidden");
    if (DOM.btnOpenLuckyBox) DOM.btnOpenLuckyBox.style.display = "block";
    if (DOM.btnCloseLuckyBox) DOM.btnCloseLuckyBox.classList.add("hidden");
    DOM.modalLuckyBox.classList.remove("hidden");
  }

  function openLuckyBoxReward() {
    if (!currentRolledReward) return;
    if (DOM.luckyRewardEmoji) DOM.luckyRewardEmoji.textContent = currentRolledReward.emoji;
    if (DOM.luckyRewardName) DOM.luckyRewardName.textContent = currentRolledReward.name;
    if (DOM.luckyRewardDesc) DOM.luckyRewardDesc.textContent = currentRolledReward.desc;

    if (DOM.luckyBoxRewardArea) DOM.luckyBoxRewardArea.classList.remove("hidden");
    if (DOM.btnOpenLuckyBox) DOM.btnOpenLuckyBox.style.display = "none";
    if (DOM.btnCloseLuckyBox) DOM.btnCloseLuckyBox.classList.remove("hidden");

    sound.finish();
    updateItemUI();
    updateShieldBadge();
    saveLocalState();
  }

  function closeLuckyBox() {
    if (DOM.modalLuckyBox) DOM.modalLuckyBox.classList.add("hidden");
    currentRolledReward = null;
  }

  function useShieldToPass() {
    const result = processShieldDecision(state, "USE_SHIELD");
    if (result.status === "CLEARED_BY_SHIELD") {
      updateShieldBadge();
      saveLocalState();
      syncWithServer("SHIELD_DEFENSE_USED", { round: state.currentRound });
      if (DOM.shieldDecisionBox) DOM.shieldDecisionBox.classList.add("hidden");

      DOM.resultTitle.textContent = "🛡️ 방패 방어 성공! 라운드 통과";
      DOM.resultSubtitle.textContent = `방패 1개를 소모하여 라운드 ${state.currentRound} 탈락을 방어하고 다음 라운드로 진출합니다! (남은 방패: ${state.shieldCount}개)`;

      const nextRoundBtn = document.getElementById("nextRoundBtn");
      if (nextRoundBtn) {
        nextRoundBtn.textContent = `🛡️ 방패 방어 성공! 라운드 ${result.nextRound} (새 10문제) 도전하기 🔥`;
        nextRoundBtn.classList.remove("hidden");
      }
      clearActiveQuizSession();
      showToast(`🛡️ 방패를 사용하여 라운드 ${result.nextRound}로 진출합니다!`);
    }
  }

  function saveShieldAndFail() {
    processShieldDecision(state, "SAVE_SHIELD");
    if (DOM.shieldDecisionBox) DOM.shieldDecisionBox.classList.add("hidden");
    DOM.resultTitle.textContent = "오늘의 10문제 완료!";
    DOM.resultSubtitle.textContent = "방패를 아끼고 보존했습니다. 오답노트로 복습해 보세요!";
    clearActiveQuizSession();
    showToast("🛡️ 방패를 보존하고 오답 복습 모드로 전환합니다.");
  }

  // Cloud Sync API
  async function syncWithServer(action = "DATA_SYNC", details = {}) {
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
          lastAttendance: state.lastAttendance,
          totalPoints: state.totalPoints || 0,
          todayScore: state.todayScore || 0,
          maxRoundToday: state.maxRoundToday || 1,
          solvedQuestionIds: Array.from(state.solvedQuestionIds),
          shieldCount: state.shieldCount || 0,
          items: state.items || { eraser5050: 2, heart: 2, booster2x: 2 },
          action,
          details
        })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.user) {
          if (typeof body.user.totalPoints === "number") state.totalPoints = body.user.totalPoints;
          if (typeof body.user.maxRoundToday === "number") state.maxRoundToday = body.user.maxRoundToday;
          if (typeof body.user.shieldCount === "number") state.shieldCount = Math.min(2, body.user.shieldCount);
          if (Array.isArray(body.user.solvedQuestionIds)) state.solvedQuestionIds = new Set(body.user.solvedQuestionIds);
          if (body.user.items) state.items = { ...state.items, ...body.user.items };
          saveLocalState();
          updateShieldBadge();
          updateItemUI();
        }
        console.log("☁️ Progress synced to cloud server.");
      }
    } catch (e) {
      console.warn("Sync failed (offline mode):", e);
    }
  }

  // Header & Dashboard Stats Update
  function updateDashboardStats() {
    if (DOM.streakCount) DOM.streakCount.textContent = state.streak;
    if (DOM.wrongBadge) DOM.wrongBadge.textContent = state.wrongQuestions.size;

    const totalSolved = state.history.reduce((sum, h) => sum + (h.total || 0), 0);
    const totalCorrect = state.history.reduce((sum, h) => sum + Math.round((h.score / 100) * (h.total || 10)), 0);
    const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

    if (DOM.statTotalSolved) DOM.statTotalSolved.textContent = `${totalSolved}제`;
    if (DOM.statAccuracy) DOM.statAccuracy.textContent = `${accuracy}%`;

    const isTodayCompleted = state.lastAttendance === state.todayDateStr;
    if (DOM.statTodayStatus) {
      DOM.statTodayStatus.textContent = isTodayCompleted ? "완료 ⚡" : "미완료";
      DOM.statTodayStatus.style.color = isTodayCompleted ? "var(--accent-green)" : "var(--accent-elec)";
    }

    updateShieldBadge();
    updateItemUI();

    const adminAuditBtn = document.getElementById("adminAuditBtn");
    if (adminAuditBtn) {
      if (state.user && state.user.username === "단민러브") {
        adminAuditBtn.classList.remove("hidden");
      } else {
        adminAuditBtn.classList.add("hidden");
      }
    }

    if (DOM.userMenu) {
      if (state.user) {
        DOM.userMenu.innerHTML = `
          <div class="user-profile">
            <span class="user-name">⚡ ${state.user.nickname || state.user.username}님</span>
            <button class="btn btn-outline-sm" id="logoutBtn">로그아웃</button>
          </div>
        `;
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
      } else {
        DOM.userMenu.innerHTML = `<button class="btn btn-outline-sm" id="authBtn">로그인</button>`;
        const authBtn = document.getElementById("authBtn");
        if (authBtn) authBtn.addEventListener("click", () => openAuthModal("login"));
      }
    }
  }

  // Switch Exam Track (Written vs Practical)
  function switchExamTrack(track) {
    if (track !== "written" && track !== "practical") return;
    state.examTrack = track;
    if (DOM.btnTrackWritten) {
      if (track === "written") DOM.btnTrackWritten.classList.add("active");
      else DOM.btnTrackWritten.classList.remove("active");
    }
    if (DOM.btnTrackPractical) {
      if (track === "practical") DOM.btnTrackPractical.classList.add("active");
      else DOM.btnTrackPractical.classList.remove("active");
    }

    const titlePrefix = track === "practical" ? "🛠️ 실기 핵심단답·계산 집중" : "⚡ 필기 5과목";
    showToast(`${titlePrefix} 모드로 전환되었습니다!`);

    // Reload current mode questions with new track
    if (state.mode === "daily") {
      loadDailyQuestions(state.currentRound || 1);
    } else if (state.mode === "level") {
      loadLevelQuestions(state.selectedLevel || 1, 1);
    } else if (state.mode === "practice") {
      loadPracticeQuestions(state.subjectId || 0);
    } else if (state.mode === "leaderboard") {
      loadLeaderboard(track);
    }
    saveLocalState();
  }

  // Load Q-Net Exam Schedule & D-Day (Precise Calculation for 2026 ~ 2027)
  async function loadQNetSchedule() {
    try {
      const res = await fetch("/api/qnet-schedule");
      if (!res.ok) return;
      const data = await res.json();
      state.qnetSchedule = data;

      if (DOM.ddaySessionText && data.nextWritten) {
        DOM.ddaySessionText.textContent = data.nextWritten.session;
      }
      if (DOM.ddayWrittenVal && data.nextWritten) {
        DOM.ddayWrittenVal.textContent = data.nextWritten.dDayText || (data.nextWritten.dDay === 0 ? "D-Day (오늘)" : `D-${data.nextWritten.dDay}`);
      }
      if (DOM.ddayPracticalVal && data.nextPractical) {
        DOM.ddayPracticalVal.textContent = data.nextPractical.dDayText || (data.nextPractical.dDay === 0 ? "D-Day (오늘)" : `D-${data.nextPractical.dDay}`);
      }

      // Populate Q-Net schedule modal list
      if (DOM.qnetScheduleListContainer && Array.isArray(data.schedules)) {
        DOM.qnetScheduleListContainer.innerHTML = data.schedules.map(s => {
          const isNextWritten = data.nextWritten && data.nextWritten.session === s.session;
          const isNextPractical = data.nextPractical && data.nextPractical.session === s.session;
          const isHighlighted = isNextWritten || isNextPractical;

          const getStatusBadge = (status, text) => {
            if (status === "in_progress") {
              return `<span style="background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444; font-size: 0.72rem; padding: 2px 6px; border-radius: 999px; font-weight: 700;">🔥 ${text}</span>`;
            } else if (status === "today") {
              return `<span style="background: rgba(251,191,36,0.25); border: 1px solid #fbbf24; color: #fbbf24; font-size: 0.72rem; padding: 2px 6px; border-radius: 999px; font-weight: 700;">⭐ D-Day</span>`;
            } else if (status === "upcoming") {
              return `<span style="background: rgba(56,189,248,0.18); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.72rem; padding: 2px 6px; border-radius: 999px; font-weight: 700;">${text}</span>`;
            }
            return `<span style="background: rgba(255,255,255,0.06); color: var(--text-dim); font-size: 0.72rem; padding: 2px 6px; border-radius: 999px;">종료</span>`;
          };

          return `
            <div style="background: rgba(255,255,255,0.04); border: ${isHighlighted ? "2px solid var(--accent-cyan); box-shadow: 0 0 14px rgba(56,189,248,0.2);" : "1px solid rgba(255,255,255,0.08);"} border-radius: 10px; padding: 12px 14px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-weight: 800; color: ${isHighlighted ? "var(--accent-cyan)" : "var(--accent-elec)"}; font-size: 0.98rem;">
                  ${s.session} ${isHighlighted ? `<span style="font-size: 0.72rem; background: var(--accent-cyan); color: #0f172a; padding: 1px 6px; border-radius: 4px; font-weight: 800; margin-left: 6px;">가장 가까운 회차</span>` : ""}
                </div>
              </div>
              <div style="font-size: 0.82rem; margin-bottom: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                <strong>⚡ 필기:</strong> 접수 ${s.written.docApp} | 시험 ${s.written.examStart}~${s.written.examEnd}
                ${getStatusBadge(s.written.status, s.written.dDayText)}
              </div>
              <div style="font-size: 0.82rem; color: var(--accent-cyan); display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
                <strong>🛠️ 실기:</strong> 접수 ${s.practical.docApp} | 시험 ${s.practical.examStart}~${s.practical.examEnd}
                ${getStatusBadge(s.practical.status, s.practical.dDayText)}
              </div>
            </div>
          `;
        }).join("");
      }
    } catch (e) {
      console.warn("Q-Net schedule load error:", e);
    }
  }

  // Load Daily Questions (Written or Practical)
  async function loadDailyQuestions(round = 1) {
    try {
      state.currentRound = Math.max(1, parseInt(round, 10) || 1);
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) {
        roundBadge.textContent = `🔥 라운드 ${state.currentRound}`;
        roundBadge.classList.remove("hidden");
      }
      if (DOM.questionText) {
        const countTxt = state.examTrack === "practical" ? "실기 엄선 5문제" : "오늘의 엄선 10문제";
        DOM.questionText.textContent = `${countTxt}를 불러오는 중입니다... (라운드 ${state.currentRound})`;
      }
      const res = await fetch(`/api/questions/daily?date=${state.todayDateStr}&round=${state.currentRound}&track=${state.examTrack}`);
      const data = await res.json();
      const rawList = data.questions || [];
      const count = state.examTrack === "practical" ? 5 : 10;
      const priorityList = selectUnsolvedFirstQuestions(rawList, count, state.solvedQuestionIds);
      state.questions = priorityList.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      updateItemUI();
      updateShieldBadge();
      saveActiveQuizSession();
    } catch (e) {
      if (DOM.questionText) DOM.questionText.textContent = "문제를 불러오지 못했습니다. 네트워크를 확인해주세요.";
    }
  }

  // Load Level-Graduated Questions (1~5 Level Daily Challenge)
  async function loadLevelQuestions(level = 1, round = 1) {
    try {
      state.selectedLevel = Math.max(1, Math.min(5, parseInt(level, 10) || 1));
      state.currentRound = Math.max(1, parseInt(round, 10) || 1);
      const levelNames = { 1: "입문/기초", 2: "개념/필수", 3: "기출/응용", 4: "심화/계산", 5: "고난도/실무" };
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) {
        roundBadge.textContent = `🎓 ${state.selectedLevel}단계: ${levelNames[state.selectedLevel]} (R${state.currentRound})`;
        roundBadge.classList.remove("hidden");
      }
      if (DOM.questionText) {
        DOM.questionText.textContent = `[${levelNames[state.selectedLevel]}] 레벨 5문제를 불러오는 중입니다...`;
      }
      const res = await fetch(`/api/questions/level?level=${state.selectedLevel}&round=${state.currentRound}&track=${state.examTrack}&date=${state.todayDateStr}`);
      const data = await res.json();
      const rawList = data.questions || [];
      const priorityList = selectUnsolvedFirstQuestions(rawList, 5, state.solvedQuestionIds);
      state.questions = priorityList.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      updateItemUI();
      updateShieldBadge();
      saveActiveQuizSession();
    } catch (e) {
      if (DOM.questionText) DOM.questionText.textContent = "레벨 문제를 불러오지 못했습니다.";
    }
  }

  // Load and cache chapter registry from backend (v3.2.0)
  async function loadChapterRegistry() {
    try {
      const res = await fetch("/api/questions/chapters");
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.chapters) {
        state.chapterRegistry = data.chapters;
      }
    } catch (e) {
      console.warn("Failed to load chapter registry:", e);
    }
  }

  // Update Practice Mode Subject & Chapter Filter UI
  function updatePracticeFilterUI() {
    // 1. Highlight subject buttons
    if (DOM.practiceSubjectButtons && DOM.practiceSubjectButtons.length > 0) {
      DOM.practiceSubjectButtons.forEach(btn => {
        const subId = parseInt(btn.dataset.sub, 10);
        btn.classList.toggle("active", subId === state.selectedSubjectId);
      });
    }

    // 2. Toggle Sub-Subject Row (Subject 4: 회로이론 vs 제어공학)
    if (DOM.subSubjectRow) {
      if (state.selectedSubjectId === 4) {
        DOM.subSubjectRow.classList.remove("hidden");
        if (DOM.subSubjectChips) {
          DOM.subSubjectChips.forEach(chip => {
            chip.classList.toggle("active", chip.dataset.subSubject === state.selectedSubSubject);
          });
        }
      } else {
        DOM.subSubjectRow.classList.add("hidden");
        state.selectedSubSubject = "";
      }
    }

    // 3. Render Chapter Chips
    if (!DOM.chapterFilterRow || !DOM.chapterChipsList) return;

    if (state.selectedSubjectId === 0) {
      DOM.chapterFilterRow.classList.add("hidden");
      state.selectedChapterId = 0;
      return;
    }

    DOM.chapterFilterRow.classList.remove("hidden");

    if (!state.chapterRegistry || !state.chapterRegistry[state.selectedSubjectId]) {
      DOM.chapterChipsList.innerHTML = `<button class="chapter-chip active" data-chapter="0" type="button">전체 장 (All)</button>`;
      return;
    }

    const subInfo = state.chapterRegistry[state.selectedSubjectId];
    let chaptersToRender = [];

    if (state.selectedSubjectId === 4 && state.selectedSubSubject) {
      const targetSub = subInfo.sub_subjects[state.selectedSubSubject];
      if (targetSub && targetSub.chapters) {
        chaptersToRender = Object.values(targetSub.chapters);
      }
    } else {
      // Aggregate all chapters in this subject
      const seen = new Set();
      Object.values(subInfo.sub_subjects).forEach(s => {
        Object.values(s.chapters).forEach(c => {
          const key = `${c.chapter_id}_${c.chapter_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            chaptersToRender.push(c);
          }
        });
      });
    }

    // Sort by chapter_id
    chaptersToRender.sort((a, b) => a.chapter_id - b.chapter_id);

    let html = `<button class="chapter-chip ${state.selectedChapterId === 0 ? "active" : ""}" data-chapter="0" type="button">전체 장 (All)</button>`;
    chaptersToRender.forEach(c => {
      const isActive = state.selectedChapterId === c.chapter_id;
      html += `<button class="chapter-chip ${isActive ? "active" : ""}" data-chapter="${c.chapter_id}" type="button">${c.chapter_name} (${c.count}제)</button>`;
    });

    DOM.chapterChipsList.innerHTML = html;

    // Attach click events
    DOM.chapterChipsList.querySelectorAll(".chapter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        state.selectedChapterId = parseInt(chip.dataset.chapter, 10) || 0;
        updatePracticeFilterUI();
        loadPracticeQuestions();
      });
    });
  }

  // Load Practice Questions (Enhanced for Subject & Chapter Deep-Dive)
  async function loadPracticeQuestions(subIdParam) {
    if (typeof subIdParam === "number") {
      state.selectedSubjectId = subIdParam;
      state.selectedChapterId = 0;
    }

    try {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      if (DOM.questionText) DOM.questionText.textContent = "문제를 선별하여 불러오는 중입니다...";

      let url = `/api/questions/practice?subject=${state.selectedSubjectId}&count=60`;
      if (state.selectedSubSubject) {
        url += `&sub_subject=${encodeURIComponent(state.selectedSubSubject)}`;
      }
      if (state.selectedChapterId > 0) {
        url += `&chapter=${state.selectedChapterId}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const rawList = data.questions || [];

      if (rawList.length === 0) {
        showToast("선택하신 단원에 해당하는 문제가 없습니다.");
        if (DOM.questionText) DOM.questionText.textContent = "해당 조건의 문제가 없습니다. 다른 단원을 선택해주세요.";
        return;
      }

      const countToPick = Math.min(10, rawList.length);
      const priorityList = selectUnsolvedFirstQuestions(rawList, countToPick, state.solvedQuestionIds);
      state.questions = priorityList.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      updateItemUI();
      saveActiveQuizSession();

      const chText = state.selectedChapterId > 0 ? ` [${state.selectedChapterId}장 집중]` : "";
      showToast(`📚 ${state.selectedSubSubject || "선택 과목"}${chText} ${state.questions.length}문제가 준비되었습니다!`);
    } catch (e) {
      if (DOM.questionText) DOM.questionText.textContent = "문제를 불러오지 못했습니다.";
    }
  }

  // Load KEC Focus Questions
  async function loadKecQuestions() {
    try {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      if (DOM.questionText) DOM.questionText.textContent = "KEC 최신 개정 집중 특강 문제를 불러오는 중입니다...";
      const res = await fetch(`/api/questions/kec`);
      const data = await res.json();
      const rawList = data.questions || [];
      state.questions = rawList.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      updateItemUI();
      showToast(`🔥 KEC 최신 개정 핵심 ${state.questions.length}문제가 준비되었습니다!`);
    } catch (e) {
      if (DOM.questionText) DOM.questionText.textContent = "KEC 문제를 불러오지 못했습니다.";
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
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      if (DOM.searchInfoText) DOM.searchInfoText.textContent = `'${trimmed}' 검색 중...`;
      const res = await fetch(`/api/questions/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      const results = data.questions || [];
      if (results.length === 0) {
        if (DOM.searchInfoText) DOM.searchInfoText.textContent = `'${trimmed}'에 대한 검색 결과가 없습니다. 다른 검색어를 시도해 보세요.`;
        showToast("검색 결과가 없습니다.");
        return;
      }
      if (DOM.searchInfoText) DOM.searchInfoText.textContent = `'${trimmed}' 검색 완료: 총 ${results.length}개의 관련 문제가 발견되었습니다.`;
      state.questions = results.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      showToast(`🔍 ${results.length}개의 문제가 검색되었습니다!`);
    } catch (e) {
      if (DOM.searchInfoText) DOM.searchInfoText.textContent = "검색 중 오류가 발생했습니다.";
    }
  }

  // Update Wrong Notes Filter UI (Subject & Chapter Filter for Mistakes)
  async function updateWrongFilterBar() {
    if (!DOM.wrongFilterBar || !DOM.wrongSubjectButtons) return;

    if (state.wrongQuestions.size === 0) {
      DOM.wrongFilterBar.classList.add("hidden");
      return;
    }

    DOM.wrongFilterBar.classList.remove("hidden");

    let allQuestions = [];
    try {
      const res = await fetch("/api/questions/practice?subject=0&count=300");
      const data = await res.json();
      allQuestions = data.questions || [];
    } catch (e) {}

    const wrongList = allQuestions.filter(q => state.wrongQuestions.has(q.id));

    // Group wrong questions by subject_id
    const subCounts = { 0: wrongList.length };
    const subNames = {
      1: "1. 전기자기학",
      2: "2. 전력공학",
      3: "3. 전기기기",
      4: "4. 회로·제어",
      5: "5. 전기설비기준",
      6: "6. 실기단답"
    };

    wrongList.forEach(q => {
      subCounts[q.subject_id] = (subCounts[q.subject_id] || 0) + 1;
    });

    // Render subject buttons
    let subHtml = `<button class="filter-btn ${state.selectedWrongSubjectId === 0 ? "active" : ""}" data-wrong-sub="0" type="button">전체 오답 (${subCounts[0]}제)</button>`;
    for (const [subId, name] of Object.entries(subNames)) {
      const cnt = subCounts[subId] || 0;
      if (cnt > 0) {
        const isActive = state.selectedWrongSubjectId === parseInt(subId, 10);
        subHtml += `<button class="filter-btn ${isActive ? "active" : ""}" data-wrong-sub="${subId}" type="button">${name} (${cnt}제)</button>`;
      }
    }
    DOM.wrongSubjectButtons.innerHTML = subHtml;

    // Attach subject button click events
    DOM.wrongSubjectButtons.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.selectedWrongSubjectId = parseInt(btn.dataset.wrongSub, 10) || 0;
        state.selectedWrongChapterId = 0;
        updateWrongFilterBar();
        loadWrongQuestions();
      });
    });

    // Render Chapter Chips if specific subject selected
    if (!DOM.wrongChapterRow || !DOM.wrongChapterChipsList) return;

    if (state.selectedWrongSubjectId === 0) {
      DOM.wrongChapterRow.classList.add("hidden");
      return;
    }

    DOM.wrongChapterRow.classList.remove("hidden");
    const subWrong = wrongList.filter(q => q.subject_id === state.selectedWrongSubjectId);
    const chCounts = {};
    const chNames = {};

    subWrong.forEach(q => {
      const chId = q.chapter_id || 1;
      chCounts[chId] = (chCounts[chId] || 0) + 1;
      chNames[chId] = q.chapter_name || `제${chId}장`;
    });

    let chHtml = `<button class="chapter-chip ${state.selectedWrongChapterId === 0 ? "active" : ""}" data-wrong-chapter="0" type="button">과목 전체 (${subWrong.length}제)</button>`;
    Object.keys(chCounts).sort((a,b) => a - b).forEach(chId => {
      const isActive = state.selectedWrongChapterId === parseInt(chId, 10);
      chHtml += `<button class="chapter-chip ${isActive ? "active" : ""}" data-wrong-chapter="${chId}" type="button">${chNames[chId]} (${chCounts[chId]}제)</button>`;
    });

    DOM.wrongChapterChipsList.innerHTML = chHtml;
    DOM.wrongChapterChipsList.querySelectorAll(".chapter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        state.selectedWrongChapterId = parseInt(chip.dataset.wrongChapter, 10) || 0;
        updateWrongFilterBar();
        loadWrongQuestions();
      });
    });
  }

  // Load Wrong Note Questions (Enhanced for Chapter Filtering)
  async function loadWrongQuestions() {
    if (state.wrongQuestions.size === 0) {
      showToast("오답노트에 저장된 문제가 없습니다! 👏");
      switchMode("daily");
      return;
    }

    try {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      if (DOM.questionText) DOM.questionText.textContent = "오답노트 문제를 준비하는 중입니다...";

      const res = await fetch("/api/questions/practice?subject=0&count=300");
      const data = await res.json();
      const all = data.questions || [];

      let filtered = all.filter(q => state.wrongQuestions.has(q.id));

      if (state.selectedWrongSubjectId > 0) {
        filtered = filtered.filter(q => q.subject_id === state.selectedWrongSubjectId);
      }
      if (state.selectedWrongChapterId > 0) {
        filtered = filtered.filter(q => q.chapter_id === state.selectedWrongChapterId);
      }

      if (filtered.length === 0) {
        showToast("선택하신 단원에는 오답이 없습니다!");
        if (DOM.questionText) DOM.questionText.textContent = "선택하신 단원에는 오답이 없습니다.";
        return;
      }

      state.questions = filtered.map(q => shuffleQuestionOptions(q));
      state.currentIndex = 0;
      state.userAnswers = {};
      renderQuestion();
      updateItemUI();
    } catch (e) {
      if (DOM.questionText) DOM.questionText.textContent = "오답노트를 불러오지 못했습니다.";
    }
  }

  // Check Mobile Lifecycle Date Rollover
  function checkDateTransition(overrideDateStr) {
    const todayStr = overrideDateStr || getKSTDateString();
    if (state.lastLoadedDate && todayStr !== state.lastLoadedDate) {
      console.log(`[HaruElec] Date transitioned: ${state.lastLoadedDate} -> ${todayStr}`);
      state.lastLoadedDate = todayStr;
      state.todayDateStr = todayStr;
      if (DOM.todayDateTag) {
        DOM.todayDateTag.textContent = `📅 ${todayStr.replace(/-/g, ". ")}`;
      }
      state.currentRound = 1;
      state.userAnswers = {};
      clearActiveQuizSession();
      switchMode("daily");
      showToast("새로운 하루가 밝았습니다! ⚡ 오늘의 10문제가 갱신되었습니다.");
      return true;
    }
    return false;
  }

  // Render Current Question
  function renderQuestion() {
    if (!state.questions || state.questions.length === 0) {
      if (DOM.questionText) DOM.questionText.textContent = "표시할 문제가 없습니다.";
      if (DOM.optionsList) DOM.optionsList.innerHTML = "";
      return;
    }

    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const currentNum = state.currentIndex + 1;

    // Header info
    const subLabel = q.sub_subject ? q.sub_subject : q.subject;
    const chLabel = q.chapter_name ? ` ❯ ${q.chapter_name}` : "";
    if (DOM.currentSubjectTag) DOM.currentSubjectTag.textContent = `제${q.subject_id}과목 ${subLabel}${chLabel}`;
    if (DOM.questionProgressText) DOM.questionProgressText.textContent = `Q ${currentNum} / ${total}`;
    if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${(currentNum / total) * 100}%`;
    if (DOM.questionYear) DOM.questionYear.textContent = `${q.year}`;
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
    if (DOM.bookmarkBtn) {
      DOM.bookmarkBtn.innerHTML = `<span class="star-icon">${isBookmarked ? "★" : "☆"}</span>`;
      DOM.bookmarkBtn.classList.toggle("active", isBookmarked);
    }

    // Question body
    if (DOM.questionText) {
      DOM.questionText.textContent = q.question;
      renderMath(DOM.questionText);
    }

    // Options
    if (DOM.optionsList) {
      DOM.optionsList.innerHTML = "";
      const answeredOption = state.userAnswers[q.id];
      const isAnswered = answeredOption !== undefined;

      q.options.forEach((optText, idx) => {
        const optNum = idx + 1;
        const optEl = document.createElement("div");
        optEl.className = "option-item";
        optEl.dataset.optNum = optNum;
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
          optEl.addEventListener("click", () => handleSelectOption(q, optNum, optEl));
        }

        DOM.optionsList.appendChild(optEl);
        renderMath(optEl);
      });

      // Apply 50:50 if active on this question
      if (!isAnswered && state.activeItem5050Indices && state.activeItem5050Indices.length > 0) {
        apply5050ToCurrentOptions(state.activeItem5050Indices);
      }
    }

    // Explanation Box
    const answeredOption = state.userAnswers[q.id];
    const isAnswered = answeredOption !== undefined;
    if (isAnswered) {
      if (DOM.explanationContent) DOM.explanationContent.textContent = q.explanation;

      // KEC Revision Highlight Card
      if (DOM.kecDiffCard) {
        if (q.kec_revision && q.kec_revision.is_revised) {
          if (DOM.kecDiffTopic) DOM.kecDiffTopic.textContent = q.kec_revision.topic || "KEC 최신 개정 비교";
          if (DOM.kecDiffBefore) DOM.kecDiffBefore.textContent = q.kec_revision.before || "-";
          if (DOM.kecDiffAfter) DOM.kecDiffAfter.textContent = q.kec_revision.after || "-";
          DOM.kecDiffCard.classList.remove("hidden");
        } else {
          DOM.kecDiffCard.classList.add("hidden");
        }
      }

      if (DOM.explanationBox) {
        DOM.explanationBox.classList.remove("hidden");
        renderMath(DOM.explanationContent);
      }
    } else {
      if (DOM.explanationBox) DOM.explanationBox.classList.add("hidden");
      if (DOM.kecDiffCard) DOM.kecDiffCard.classList.add("hidden");
    }

    // Navigation buttons
    if (DOM.prevBtn) DOM.prevBtn.disabled = state.currentIndex === 0;

    const allAnswered = state.questions.every(item => state.userAnswers[item.id] !== undefined);
    if (state.currentIndex === total - 1) {
      if (DOM.nextBtn) DOM.nextBtn.classList.add("hidden");
      if (DOM.finishBtn) {
        DOM.finishBtn.classList.remove("hidden");
        DOM.finishBtn.disabled = !allAnswered;
      }
    } else {
      if (DOM.nextBtn) DOM.nextBtn.classList.remove("hidden");
      if (DOM.finishBtn) DOM.finishBtn.classList.add("hidden");
    }
  }

  // Handle Option Selection
  function handleSelectOption(question, selectedOption, targetOptEl) {
    if (state.userAnswers[question.id] !== undefined) return; // already answered

    const isCorrect = selectedOption === question.answer;

    // Heart Protection Item Check
    if (!isCorrect && state.activeItemHeart) {
      state.activeItemHeart = false;
      hideActiveItemBanner();
      updateItemUI();
      sound.wrong();
      showToast("💖 절연 보호 발동! 오답이 방어되었습니다. 다른 보기를 선택하세요!");
      if (targetOptEl) {
        targetOptEl.classList.add("wrong", "locked");
        targetOptEl.style.pointerEvents = "none";
        targetOptEl.style.opacity = "0.45";
      }
      saveActiveQuizSession();
      return;
    }

    state.userAnswers[question.id] = selectedOption;
    recordQuestionSolved(question.id);

    if (isCorrect) {
      sound.correct();
      state.wrongQuestions.delete(question.id);
      // 깜짝 보너스 럭키 박스 드롭 (~28% 확률)
      triggerLuckyBoxRoll();
    } else {
      sound.wrong();
      state.wrongQuestions.add(question.id);
      state.lastSelectedWrongOption = selectedOption;
    }

    state.activeItem5050Indices = []; // clear after answering
    saveLocalState();
    saveActiveQuizSession();
    updateDashboardStats();
    renderQuestion();

    setTimeout(() => {
      if (DOM.explanationBox) {
        DOM.explanationBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
    if (DOM.scoreNum) DOM.scoreNum.textContent = score;

    const isPass = score >= 60;
    if (DOM.scoreStatus) {
      DOM.scoreStatus.innerHTML = isPass
        ? `<span class="pass-tag">⚡ 합격권 달성! (기준 60점 이상)</span>`
        : `<span class="fail-tag" style="color:var(--accent-red);background:rgba(239,68,68,0.15);padding:4px 14px;border-radius:9999px;font-weight:700;font-size:0.85rem;">과락/점수 미달 - 오답노트로 복습해 보세요!</span>`;
    }

    // Subject breakdown
    if (DOM.subjectResultsGrid) {
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
    }

    const nextRoundBtn = document.getElementById("nextRoundBtn");
    const multiplier = state.pointMultiplier || 1;
    const isRoundMode = (state.mode === "daily" || state.mode === "level");

    // Record streak & attendance for daily or level round mode
    if (isRoundMode) {
      if (state.lastAttendance !== state.todayDateStr) {
        state.streak = (state.streak || 0) + 1;
        state.lastAttendance = state.todayDateStr;
        showToast(`🎉 오늘 출석 번개 도장 완료! (${state.streak}일 연속)`);
      }

      state.history.push({
        date: state.todayDateStr,
        mode: state.mode,
        level: state.selectedLevel,
        track: state.examTrack,
        round: state.currentRound,
        score,
        total,
        correctCount,
        timestamp: new Date().toISOString()
      });

      // Update segregated round ranks
      if (state.examTrack === "practical") {
        state.maxRoundPractical = Math.max(state.maxRoundPractical || 1, state.currentRound);
      } else {
        state.maxRoundWritten = Math.max(state.maxRoundWritten || 1, state.currentRound);
      }
      state.maxRoundToday = Math.max(state.maxRoundToday || 1, state.currentRound);

      if (score === 100) {
        let bonusPoints = 50;
        if (state.activeItemMagnet) {
          bonusPoints += 50; // 콤보 자석 가산점 2배
          showToast("🧲 전자석 콤보 폭발! 콤보 가산점 +50P 추가 흡수!");
        }
        const totalRoundPoints = (score + bonusPoints) * multiplier;
        state.totalPoints = (state.totalPoints || 0) + totalRoundPoints;
        state.todayScore = Math.max(state.todayScore || 0, score);

        // Award shield & consecutive bonuses
        const awardRes = awardShieldForConsecutivePerfect(state, 100);
        if (awardRes.shieldAwarded) {
          showToast(`🛡️ 2연속 만점 보상으로 방패 1개를 획득했습니다! (보유: ${state.shieldCount}/2)`);
        }
        if (awardRes.bonusPoints > 0) {
          showToast(`🔥 3연속 만점 신화 달성! 보너스 +${awardRes.bonusPoints}P 추가 지급!`);
        }

        const roundQuestionsCount = state.mode === "level" ? 5 : 10;
        if (DOM.resultTitle) DOM.resultTitle.textContent = `🎉 라운드 ${state.currentRound} 만점 통과!`;
        if (DOM.resultSubtitle) DOM.resultSubtitle.textContent = `${total}문제를 모두 맞히셨습니다! 다음 라운드에 도전해 실력을 뽐내보세요! 🔥`;
        if (nextRoundBtn) {
          nextRoundBtn.textContent = `🎉 100점 만점 통과! 라운드 ${state.currentRound + 1} (새 ${roundQuestionsCount}문제) 도전하기 🔥 (+${totalRoundPoints}P)`;
          nextRoundBtn.classList.remove("hidden");
        }
        if (DOM.shieldDecisionBox) DOM.shieldDecisionBox.classList.add("hidden");

        clearActiveQuizSession();
        saveLocalState();
        syncWithServer("ROUND_CLEAR", { round: state.currentRound, mode: state.mode, track: state.examTrack, score: 100 });
        showToast(`🎉 라운드 ${state.currentRound} 100점 만점 돌파! (+${totalRoundPoints}P)`);
      } else {
        const earnedPoints = score * multiplier;
        state.totalPoints = (state.totalPoints || 0) + earnedPoints;
        state.todayScore = Math.max(state.todayScore || 0, score);
        if (DOM.resultTitle) DOM.resultTitle.textContent = state.mode === "level" ? "난이도별 5문제 완료!" : "오늘의 10문제 완료!";
        if (DOM.resultSubtitle) DOM.resultSubtitle.textContent = "수고하셨습니다. 꾸준한 문제 풀이가 합격을 만듭니다.";
        if (nextRoundBtn) nextRoundBtn.classList.add("hidden");

        awardShieldForConsecutivePerfect(state, score);

        // Shield Decision Box on round failure
        if (state.shieldCount > 0) {
          if (DOM.shieldDecisionBox) {
            if (DOM.shieldDecisionCount) DOM.shieldDecisionCount.textContent = state.shieldCount;
            DOM.shieldDecisionBox.classList.remove("hidden");
          }
        } else {
          if (DOM.shieldDecisionBox) DOM.shieldDecisionBox.classList.add("hidden");
          clearActiveQuizSession();
        }

        saveLocalState();
        syncWithServer("QUIZ_FINISH", { round: state.currentRound, mode: state.mode, track: state.examTrack, score });
      }

      // Reset round multiplier & active items
      state.pointMultiplier = 1;
      state.activeItemHeart = false;
      state.activeItemMagnet = false;
      state.activeItem5050Indices = [];
      hideActiveItemBanner();
      updateItemUI();
      updateShieldBadge();
      updateDashboardStats();
    } else {
      if (nextRoundBtn) nextRoundBtn.classList.add("hidden");
      if (DOM.shieldDecisionBox) DOM.shieldDecisionBox.classList.add("hidden");
      state.pointMultiplier = 1;
      state.activeItemHeart = false;
      state.activeItem5050Indices = [];
      hideActiveItemBanner();
      updateItemUI();
      clearActiveQuizSession();
    }

    if (DOM.quizSection) DOM.quizSection.classList.add("hidden");
    if (DOM.resultSection) DOM.resultSection.classList.remove("hidden");
  }

  // Switch App Mode
  function switchMode(newMode) {
    state.mode = newMode;
    DOM.modeTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mode === newMode);
    });

    DOM.resultSection.classList.add("hidden");

    const leaderboardSection = document.getElementById("leaderboardSection");
    if (leaderboardSection) leaderboardSection.classList.add("hidden");

    if (newMode === "leaderboard") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      DOM.quizSection.classList.add("hidden");
      DOM.statsSection.classList.add("hidden");
      if (leaderboardSection) leaderboardSection.classList.remove("hidden");
      loadLeaderboard();
      return;
    }

    if (newMode === "stats") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      DOM.quizSection.classList.add("hidden");
      DOM.statsSection.classList.remove("hidden");
      renderStatsView();
      loadUserLogs();
      return;
    }

    DOM.statsSection.classList.add("hidden");
    DOM.quizSection.classList.remove("hidden");

    if (newMode === "daily") {
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadDailyQuestions(state.currentRound || 1);
    } else if (newMode === "practice") {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      DOM.subjectFilterBar.classList.remove("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      updatePracticeFilterUI();
      loadPracticeQuestions();
    } else if (newMode === "kec") {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      loadKecQuestions();
    } else if (newMode === "search") {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.remove("hidden");
      if (DOM.searchInput.value.trim()) {
        performSearch(DOM.searchInput.value.trim());
      } else {
        DOM.searchInput.focus();
      }
    } else if (newMode === "wrong") {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.remove("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      updateWrongFilterBar();
      loadWrongQuestions();
    } else if (newMode === "level") {
      const roundBadge = document.getElementById("quizRoundBadge");
      if (roundBadge) roundBadge.classList.add("hidden");
      DOM.subjectFilterBar.classList.add("hidden");
      if (DOM.wrongFilterBar) DOM.wrongFilterBar.classList.add("hidden");
      if (DOM.searchBarWrap) DOM.searchBarWrap.classList.add("hidden");
      if (DOM.modalLevelSelect) DOM.modalLevelSelect.classList.remove("hidden");
      loadLevelQuestions(state.selectedLevel || 1, 1);
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

  // Real-time Leaderboard View (Segregated by track: written vs practical)
  async function loadLeaderboard(track = state.examTrack || "written") {
    const tableBody = document.getElementById("leaderboardTableBody");
    if (!tableBody) return;

    if (DOM.lbTabWritten && DOM.lbTabPractical) {
      if (track === "practical") {
        DOM.lbTabPractical.classList.add("active");
        DOM.lbTabWritten.classList.remove("active");
        if (DOM.lbRoundColHeader) DOM.lbRoundColHeader.textContent = "실기 최고 라운드";
      } else {
        DOM.lbTabWritten.classList.add("active");
        DOM.lbTabPractical.classList.remove("active");
        if (DOM.lbRoundColHeader) DOM.lbRoundColHeader.textContent = "필기 최고 라운드";
      }
    }

    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">${track === "practical" ? "실기" : "필기"} 실시간 랭킹을 집계 중입니다...</td></tr>`;

    try {
      const res = await fetch(`/api/leaderboard?track=${track}`);
      if (!res.ok) throw new Error("Leaderboard fetch failed");
      const data = await res.json();
      const list = data.leaderboard || [];

      if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">아직 등록된 랭킹 데이터가 없습니다. 첫 문제에 도전해 보세요!</td></tr>`;
        return;
      }

      tableBody.innerHTML = list.map((user, idx) => {
        const rank = idx + 1;
        const medalClass = rank === 1 ? "rank-medal-1" : rank === 2 ? "rank-medal-2" : rank === 3 ? "rank-medal-3" : "rank-medal-other";
        const medalText = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const isMe = state.user && (state.user.username === user.username || state.user.nickname === user.nickname);
        const meTag = isMe ? `<span class="user-badge-me">나</span>` : "";
        const roundNum = track === "practical" ? (user.maxRoundPractical || 1) : (user.maxRoundWritten || user.maxRoundToday || 1);
        const roundBadge = roundNum > 1
          ? `<span class="user-badge-round">🔥 ${roundNum}R</span>`
          : `<span style="color: var(--text-dim); font-size: 0.8rem;">1R</span>`;

        return `
          <tr class="${isMe ? "my-rank-row" : ""}">
            <td style="text-align: center;">
              <span class="rank-num-badge ${medalClass}">${medalText}</span>
            </td>
            <td>
              <strong style="color: var(--text-main); font-size: 0.95rem;">${user.nickname || user.username}</strong>
              ${meTag}
              ${!isMe ? `<button class="btn-table-cheer" data-user="${user.username}" data-name="${user.nickname || user.username}" title="응원 메시지 보내기" style="margin-left: 6px;">💌</button>` : ""}
            </td>
            <td style="text-align: center; color: var(--accent-elec); font-weight: 700;">
              ${user.streak || 0}일 🔥
            </td>
            <td style="text-align: center;">
              ${roundBadge}
            </td>
            <td style="text-align: right; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono);">
              ${(user.totalPoints || 0).toLocaleString()} P
            </td>
          </tr>
        `;
      }).join("");

      tableBody.querySelectorAll(".btn-table-cheer").forEach(btn => {
        btn.addEventListener("click", () => {
          const u = btn.dataset.user;
          const n = btn.dataset.name;
          openSendMessageModal(n, u);
        });
      });
    } catch (e) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 24px; color: var(--accent-red);">랭킹 정보를 불러오지 못했습니다. 네트워크를 확인해 주세요.</td></tr>`;
    }
  }

  // User Activity & Access Logs (last 30 logs)
  async function loadUserLogs() {
    const container = document.getElementById("userLogsContainer");
    if (!container) return;

    if (!state.user || !state.user.token) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px;">로그인 시 최근 활동 기록이 표시됩니다.</div>`;
      return;
    }

    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px;">활동 이력을 불러오는 중...</div>`;

    try {
      const res = await fetch("/api/user/logs", {
        headers: { "Authorization": `Bearer ${state.user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs || [];
        if (logs.length === 0) {
          container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 14px;">기록된 활동 이력이 없습니다.</div>`;
          return;
        }
        container.innerHTML = logs.map(l => {
          const badgeClass = l.action || "DEFAULT";
          const actionText = l.action === "LOGIN_SUCCESS" ? "로그인 성공"
            : l.action === "LOGIN_FAIL" ? "로그인 실패"
            : l.action === "REGISTER" ? "회원가입"
            : l.action === "ROUND_CLEAR" ? `라운드 클리어 (${l.details && l.details.round ? l.details.round + "R" : ""})`
            : l.action === "DATA_SYNC" ? "학습 동기화"
            : "활동 기록";

          return `
            <div class="log-item-row">
              <div>
                <span class="log-badge ${badgeClass}">${actionText}</span>
                <div class="log-meta">IP: ${l.ip || "-"}</div>
              </div>
              <div class="log-time">${l.kstTime || l.timestamp || ""}</div>
            </div>
          `;
        }).join("");
      } else {
        container.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 14px;">활동 이력을 불러오지 못했습니다.</div>`;
      }
    } catch (e) {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 14px;">서버와 통신할 수 없습니다.</div>`;
    }
  }

  // Admin Audit Logs Modal (Only for '단민러브')
  async function loadAdminLogs() {
    const container = document.getElementById("adminLogsContainer");
    if (!container) return;

    if (!state.user || state.user.username !== "단민러브") {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">관리자 전용 기능입니다.</div>`;
      return;
    }

    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">시놀로지 NAS 감사 로그 동기화 중...</div>`;

    try {
      const res = await fetch("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${state.user.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const logs = data.logs || [];
        if (logs.length === 0) {
          container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">저장된 보안 감사 로그가 없습니다.</div>`;
          return;
        }

        container.innerHTML = logs.map(l => {
          const badgeClass = l.action || "DEFAULT";
          const actionText = l.action === "LOGIN_SUCCESS" ? "로그인 성공"
            : l.action === "LOGIN_FAIL" ? "로그인 실패"
            : l.action === "REGISTER" ? "회원가입"
            : l.action === "ROUND_CLEAR" ? `라운드 클리어 (${l.details && l.details.round ? l.details.round + "R" : ""})`
            : l.action === "DATA_SYNC" ? "동기화"
            : "활동";

          return `
            <div class="log-item-row" style="padding: 10px 12px;">
              <div>
                <strong style="color: var(--text-main); font-size: 0.9rem;">${l.username || "비회원"}</strong>
                <span class="log-badge ${badgeClass}" style="margin-left: 6px;">${actionText}</span>
                <div class="log-meta">IP: ${l.ip || "-"} · ${l.userAgent ? l.userAgent.substring(0, 45) + "..." : "-"}</div>
              </div>
              <div class="log-time" style="font-family: var(--font-mono);">${l.kstTime || l.timestamp || ""}</div>
            </div>
          `;
        }).join("");
      } else {
        container.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">감사 로그 조회 권한이 없거나 에러가 발생했습니다. (403 Forbidden)</div>`;
      }
    } catch (e) {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">서버와 통신할 수 없습니다.</div>`;
    }
  }

  // ==========================================================
  // v3.1.0 PWA & Mobile Installation Engine
  // ==========================================================
  function initPwa() {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
        }).catch((err) => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type === "HARUELEC_PUSH_RECEIVED") {
          checkUnreadMessages();
        } else if (event.data && event.data.type === "OPEN_INBOX") {
          openInboxModal();
        }
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        state.deferredPwaPrompt = e;
        if (DOM.btnPwaInstall) {
          DOM.btnPwaInstall.style.animation = "badgePulse 2s infinite ease-in-out";
        }
      });

      window.addEventListener("appinstalled", () => {
        state.deferredPwaPrompt = null;
        showToast("🎉 하루전기 앱이 홈 화면에 성공적으로 설치되었습니다!");
      });
    }
  }

  function openPwaGuideModal(tab = "android") {
    if (!DOM.modalPwaGuide) return;
    DOM.modalPwaGuide.classList.remove("hidden");
    switchPwaGuideTab(tab);
  }

  function switchPwaGuideTab(tab = "android") {
    if (tab === "ios") {
      if (DOM.tabPwaIos) DOM.tabPwaIos.classList.add("active");
      if (DOM.tabPwaAndroid) DOM.tabPwaAndroid.classList.remove("active");
      if (DOM.panelPwaIos) DOM.panelPwaIos.classList.remove("hidden");
      if (DOM.panelPwaAndroid) DOM.panelPwaAndroid.classList.add("hidden");
    } else {
      if (DOM.tabPwaAndroid) DOM.tabPwaAndroid.classList.add("active");
      if (DOM.tabPwaIos) DOM.tabPwaIos.classList.remove("active");
      if (DOM.panelPwaAndroid) DOM.panelPwaAndroid.classList.remove("hidden");
      if (DOM.panelPwaIos) DOM.panelPwaIos.classList.add("hidden");
    }
  }

  async function triggerPwaPrompt() {
    if (state.deferredPwaPrompt) {
      state.deferredPwaPrompt.prompt();
      const choice = await state.deferredPwaPrompt.userChoice;
      if (choice.outcome === "accepted") {
        showToast("앱 설치를 수락해 주셔서 감사합니다! ⚡");
      }
      state.deferredPwaPrompt = null;
      if (DOM.modalPwaGuide) DOM.modalPwaGuide.classList.add("hidden");
    } else {
      showToast("브라우저 메뉴(⋮)에서 '홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요.");
    }
  }

  // ==========================================================
  // v3.1.0 Member-to-Member Direct Messaging & Realtime Push
  // ==========================================================
  function openSendMessageModal(recipientName = "전체 수험생", recipientUsername = "") {
    if (!state.user || !state.user.token) {
      showToast("응원 메시지를 보내려면 먼저 로그인이 필요합니다.");
      openAuthModal("login");
      return;
    }
    state.currentRecipient = { name: recipientName, username: recipientUsername };
    if (DOM.msgRecipientName) DOM.msgRecipientName.textContent = recipientName;
    if (DOM.msgContentInput) {
      DOM.msgContentInput.value = "";
      if (DOM.msgCharCount) DOM.msgCharCount.textContent = "0 / 200자";
    }
    if (DOM.modalSendMessage) DOM.modalSendMessage.classList.remove("hidden");
  }

  async function handleSendMessageSubmit() {
    if (!state.user || !state.user.token) {
      showToast("로그인이 필요합니다.");
      return;
    }
    const content = (DOM.msgContentInput ? DOM.msgContentInput.value : "").trim();
    if (!content) {
      showToast("메시지 내용을 입력해 주세요.");
      return;
    }
    const recipient = state.currentRecipient || { username: "" };
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.user.token}`
        },
        body: JSON.stringify({
          toUsername: recipient.username || recipient.name || "",
          toName: recipient.name || "",
          content: content,
          emojiTag: "⚡"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "메시지 발송에 실패했습니다.");
        return;
      }
      showToast("💌 응원 메시지가 성공적으로 발송되었습니다!");
      if (DOM.modalSendMessage) DOM.modalSendMessage.classList.add("hidden");
      if (DOM.msgContentInput) DOM.msgContentInput.value = "";
      if (DOM.modalInbox && !DOM.modalInbox.classList.contains("hidden")) {
        loadInboxMessages(state.inboxFilter);
      }
    } catch (e) {
      showToast("메시지 발송 중 오류가 발생했습니다.");
    }
  }

  async function checkUnreadMessages() {
    if (!state.user || !state.user.token) {
      if (DOM.inboxUnreadBadge) DOM.inboxUnreadBadge.classList.add("hidden");
      return;
    }
    try {
      const res = await fetch("/api/messages/check", {
        headers: { "Authorization": `Bearer ${state.user.token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const count = data.unreadCount || 0;
      state.unreadMessagesCount = count;

      if (DOM.inboxUnreadBadge) {
        if (count > 0) {
          DOM.inboxUnreadBadge.textContent = count > 99 ? "99+" : count;
          DOM.inboxUnreadBadge.classList.remove("hidden");
        } else {
          DOM.inboxUnreadBadge.classList.add("hidden");
        }
      }

      if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
        if (count > 0) navigator.setAppBadge(count).catch(() => {});
        else navigator.clearAppBadge().catch(() => {});
      }

      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const latestMsg = data.messages[0];
        if (state.lastSeenMessageId !== latestMsg.id) {
          state.lastSeenMessageId = latestMsg.id;
          sound.messageChime();
          showIncomingMessagePopup(latestMsg);
        }
      }
    } catch (e) {}
  }

  function showIncomingMessagePopup(msg) {
    if (!DOM.modalIncomingMessage || !msg) return;
    if (DOM.incomingSenderName) DOM.incomingSenderName.textContent = msg.fromName || msg.fromUsername;
    if (DOM.incomingContentBox) DOM.incomingContentBox.textContent = msg.content;
    DOM.modalIncomingMessage.classList.remove("hidden");

    if (DOM.btnReplyIncoming) {
      DOM.btnReplyIncoming.onclick = () => {
        DOM.modalIncomingMessage.classList.add("hidden");
        openSendMessageModal(msg.fromName || msg.fromUsername, msg.fromUsername);
      };
    }
  }

  function openInboxModal() {
    if (!state.user || !state.user.token) {
      showToast("메시지 보관함을 확인하려면 로그인이 필요합니다.");
      openAuthModal("login");
      return;
    }
    if (DOM.modalInbox) DOM.modalInbox.classList.remove("hidden");
    loadInboxMessages("all");
    updatePushToggleUI();
  }

  async function loadInboxMessages(filter = "all") {
    state.inboxFilter = filter;
    if (DOM.tabInboxAll) DOM.tabInboxAll.classList.toggle("active", filter === "all");
    if (DOM.tabInboxReceived) DOM.tabInboxReceived.classList.toggle("active", filter === "received");
    if (DOM.tabInboxSent) DOM.tabInboxSent.classList.toggle("active", filter === "sent");

    if (!DOM.inboxMessageList) return;
    DOM.inboxMessageList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">메시지 목록을 불러오는 중...</div>`;

    if (!state.user || !state.user.token) return;

    try {
      const res = await fetch("/api/messages/inbox", {
        headers: { "Authorization": `Bearer ${state.user.token}` }
      });
      if (!res.ok) throw new Error("Inbox fetch failed");
      const data = await res.json();
      const allMsgs = data.messages || [];
      state.inboxMessages = allMsgs;

      let filtered = allMsgs;
      if (filter === "received") {
        filtered = allMsgs.filter(m => m.toUsername === state.user.username);
      } else if (filter === "sent") {
        filtered = allMsgs.filter(m => m.fromUsername === state.user.username);
      }

      if (filtered.length === 0) {
        DOM.inboxMessageList.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📬</div>
            <strong>도착한 응원 메시지가 아직 없습니다.</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">명예의 전당에서 다른 수험생에게 먼저 따뜻한 응원을 보내보세요!</p>
          </div>
        `;
        return;
      }

      DOM.inboxMessageList.innerHTML = filtered.map(m => {
        const isReceived = m.toUsername === state.user.username;
        const targetLabel = isReceived ? `보낸 수험생: ${m.fromName || m.fromUsername}` : `받는 수험생: ${m.toName || m.toUsername}`;
        const isUnread = isReceived && !m.read;

        return `
          <div class="inbox-msg-card ${isUnread ? "unread" : ""}" data-id="${m.id}">
            <div class="inbox-msg-header">
              <span class="inbox-msg-sender">
                ${isReceived ? "📥 " : "📤 "} ${targetLabel}
              </span>
              <span class="inbox-msg-time">${m.kstTime ? m.kstTime.substring(5, 16) : ""}</span>
            </div>
            <div class="inbox-msg-body">${m.content}</div>
            <div class="inbox-msg-footer">
              ${isReceived ? `<button class="btn btn-outline-sm btn-reply-msg" data-sender="${m.fromUsername}" data-name="${m.fromName || m.fromUsername}" style="font-size: 0.76rem; padding: 2px 8px;">💌 답장</button>` : ""}
            </div>
          </div>
        `;
      }).join("");

      DOM.inboxMessageList.querySelectorAll(".btn-reply-msg").forEach(btn => {
        btn.addEventListener("click", () => {
          const sName = btn.dataset.name;
          const sUser = btn.dataset.sender;
          if (DOM.modalInbox) DOM.modalInbox.classList.add("hidden");
          openSendMessageModal(sName, sUser);
        });
      });
    } catch (e) {
      DOM.inboxMessageList.innerHTML = `<div style="text-align: center; color: var(--accent-red); padding: 20px;">메시지 목록을 불러오지 못했습니다.</div>`;
    }
  }

  async function markAllMessagesRead() {
    if (!state.user || !state.user.token) return;
    try {
      await fetch("/api/messages/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.user.token}`
        },
        body: JSON.stringify({ all: true })
      });
      showToast("모든 메시지를 읽음 처리했습니다.");
      checkUnreadMessages();
      loadInboxMessages(state.inboxFilter);
    } catch (e) {}
  }

  function updatePushToggleUI() {
    if (!DOM.btnTogglePush) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      DOM.btnTogglePush.textContent = "알림 켜짐 ✓";
      DOM.btnTogglePush.style.color = "var(--accent-elec)";
      DOM.btnTogglePush.style.borderColor = "var(--accent-elec)";
    } else {
      DOM.btnTogglePush.textContent = "알림 켜기";
      DOM.btnTogglePush.style.color = "#38bdf8";
      DOM.btnTogglePush.style.borderColor = "#38bdf8";
    }
  }

  async function handleTogglePush() {
    if (typeof Notification === "undefined") {
      showToast("이 브라우저는 웹 알림을 지원하지 않습니다.");
      return;
    }
    if (Notification.permission === "granted") {
      showToast("웹 푸시 알림이 이미 활성화되어 있습니다!");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showToast("🔔 실시간 응원 메시지 푸시 알림이 켜졌습니다!");
      updatePushToggleUI();
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const vapidRes = await fetch("/api/push/vapid-public-key");
          if (vapidRes.ok) {
            const { publicKey } = await vapidRes.json();
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
            if (state.user && state.user.token) {
              await fetch("/api/push/subscribe", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${state.user.token}`
                },
                body: JSON.stringify({ subscription: sub })
              });
            }
          }
        } catch (e) {
          console.warn("[Push] Subscribe registration error:", e);
        }
      }
    } else {
      showToast("알림 권한이 차단되었습니다. 브라우저 설정에서 권한을 허용해 주세요.");
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Setup Event Listeners
  function initEvents() {
    // Mode tabs
    DOM.modeTabs.forEach(tab => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    // Leaderboard refresh
    const refreshLeaderboardBtn = document.getElementById("refreshLeaderboardBtn");
    if (refreshLeaderboardBtn) {
      refreshLeaderboardBtn.addEventListener("click", () => loadLeaderboard());
    }

    // Admin Audit Modal Controls
    const adminAuditBtn = document.getElementById("adminAuditBtn");
    const adminAuditModal = document.getElementById("adminAuditModal");
    const closeAdminAuditModal = document.getElementById("closeAdminAuditModal");
    const refreshAdminLogsBtn = document.getElementById("refreshAdminLogsBtn");

    if (adminAuditBtn && adminAuditModal) {
      adminAuditBtn.addEventListener("click", () => {
        adminAuditModal.classList.remove("hidden");
        loadAdminLogs();
      });
    }
    if (closeAdminAuditModal && adminAuditModal) {
      closeAdminAuditModal.addEventListener("click", () => {
        adminAuditModal.classList.add("hidden");
      });
    }
    if (refreshAdminLogsBtn) {
      refreshAdminLogsBtn.addEventListener("click", () => loadAdminLogs());
    }

    // Next Consecutive Round Button
    const nextRoundBtn = document.getElementById("nextRoundBtn");
    if (nextRoundBtn) {
      nextRoundBtn.addEventListener("click", () => {
        state.currentRound = (state.currentRound || 1) + 1;
        switchMode("daily");
        loadDailyQuestions(state.currentRound);
      });
    }

    // Practice Subject & Chapter filters
    if (DOM.practiceSubjectButtons && DOM.practiceSubjectButtons.length > 0) {
      DOM.practiceSubjectButtons.forEach(btn => {
        btn.addEventListener("click", () => {
          DOM.practiceSubjectButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const subId = parseInt(btn.dataset.sub, 10);
          state.selectedSubjectId = subId;
          state.selectedChapterId = 0;
          if (subId === 4) {
            state.selectedSubSubject = "회로이론";
          } else {
            state.selectedSubSubject = "";
          }
          updatePracticeFilterUI();
          loadPracticeQuestions();
        });
      });
    }

    // Sub-Subject Chips (회로이론 vs 제어공학)
    if (DOM.subSubjectChips && DOM.subSubjectChips.length > 0) {
      DOM.subSubjectChips.forEach(chip => {
        chip.addEventListener("click", () => {
          DOM.subSubjectChips.forEach(c => c.classList.remove("active"));
          chip.classList.add("active");
          state.selectedSubSubject = chip.dataset.subSubject;
          state.selectedChapterId = 0;
          updatePracticeFilterUI();
          loadPracticeQuestions();
        });
      });
    }

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
    if (DOM.restartDailyBtn) DOM.restartDailyBtn.addEventListener("click", () => switchMode("daily"));
    if (DOM.reviewWrongBtn) DOM.reviewWrongBtn.addEventListener("click", () => switchMode("wrong"));

    // Reload page manual button
    if (DOM.btnReloadPage) {
      DOM.btnReloadPage.addEventListener("click", () => {
        saveActiveQuizSession();
        if (typeof window !== "undefined") window.location.reload(true);
      });
    }

    // Game Guide Modal
    if (DOM.gameGuideBtn && DOM.gameGuideModal) {
      DOM.gameGuideBtn.addEventListener("click", () => {
        DOM.gameGuideModal.classList.remove("hidden");
      });
    }
    if (DOM.closeGameGuideModal && DOM.gameGuideModal) {
      DOM.closeGameGuideModal.addEventListener("click", () => {
        DOM.gameGuideModal.classList.add("hidden");
      });
    }

    // Resume Quiz Banner
    if (DOM.btnResumeQuiz) {
      DOM.btnResumeQuiz.addEventListener("click", () => {
        const restored = restoreActiveQuizSession(state);
        if (restored) {
          switchMode(state.mode || "daily");
          renderQuestion();
          updateItemUI();
          updateShieldBadge();
          showToast("⚡ 이전에 풀던 10문제를 복원했습니다!");
        }
      });
    }
    if (DOM.btnDismissResume) {
      DOM.btnDismissResume.addEventListener("click", () => {
        clearActiveQuizSession();
      });
    }

    // Written vs Practical Track Switching
    if (DOM.btnTrackWritten) {
      DOM.btnTrackWritten.addEventListener("click", () => switchExamTrack("written"));
    }
    if (DOM.btnTrackPractical) {
      DOM.btnTrackPractical.addEventListener("click", () => switchExamTrack("practical"));
    }

    // Q-Net Schedule Modal
    if (DOM.btnOpenQNetModal && DOM.modalQNetSchedule) {
      DOM.btnOpenQNetModal.addEventListener("click", () => {
        DOM.modalQNetSchedule.classList.remove("hidden");
      });
    }
    if (DOM.closeQNetModal && DOM.modalQNetSchedule) {
      DOM.closeQNetModal.addEventListener("click", () => {
        DOM.modalQNetSchedule.classList.add("hidden");
      });
    }

    // Level Mode & Modal
    if (DOM.tabModeLevel) {
      DOM.tabModeLevel.addEventListener("click", () => {
        if (DOM.modalLevelSelect) DOM.modalLevelSelect.classList.remove("hidden");
      });
    }
    if (DOM.btnCloseLevelModal && DOM.modalLevelSelect) {
      DOM.btnCloseLevelModal.addEventListener("click", () => {
        DOM.modalLevelSelect.classList.add("hidden");
      });
    }
    if (DOM.levelOptCards && DOM.levelOptCards.length > 0) {
      DOM.levelOptCards.forEach(card => {
        card.addEventListener("click", () => {
          const lvl = parseInt(card.dataset.level, 10) || 1;
          DOM.levelOptCards.forEach(c => c.classList.remove("active"));
          card.classList.add("active");
          if (DOM.modalLevelSelect) DOM.modalLevelSelect.classList.add("hidden");
          switchMode("level");
          loadLevelQuestions(lvl, 1);
        });
      });
    }

    // In-Game Chance Items (7 items)
    if (DOM.btnItem5050) DOM.btnItem5050.addEventListener("click", useItem5050);
    if (DOM.btnItemHeart) DOM.btnItemHeart.addEventListener("click", useItemHeart);
    if (DOM.btnItem2x) DOM.btnItem2x.addEventListener("click", useItem2x);
    if (DOM.btnItemHint) DOM.btnItemHint.addEventListener("click", useItemHint);
    if (DOM.btnItemClover) DOM.btnItemClover.addEventListener("click", useItemClover);
    if (DOM.btnItemTimemachine) DOM.btnItemTimemachine.addEventListener("click", useItemTimemachine);
    if (DOM.btnItemMagnet) DOM.btnItemMagnet.addEventListener("click", useItemMagnet);
    if (DOM.btnCloseHint && DOM.quizHintBox) {
      DOM.btnCloseHint.addEventListener("click", () => {
        DOM.quizHintBox.classList.add("hidden");
      });
    }

    // Lucky Box
    if (DOM.btnOpenLuckyBox) DOM.btnOpenLuckyBox.addEventListener("click", openLuckyBoxReward);
    if (DOM.btnCloseLuckyBox) DOM.btnCloseLuckyBox.addEventListener("click", closeLuckyBox);

    // Leaderboard Track Tabs
    if (DOM.lbTabWritten) {
      DOM.lbTabWritten.addEventListener("click", () => {
        if (DOM.lbTabWritten) DOM.lbTabWritten.classList.add("active");
        if (DOM.lbTabPractical) DOM.lbTabPractical.classList.remove("active");
        loadLeaderboard("written");
      });
    }
    if (DOM.lbTabPractical) {
      DOM.lbTabPractical.addEventListener("click", () => {
        if (DOM.lbTabPractical) DOM.lbTabPractical.classList.add("active");
        if (DOM.lbTabWritten) DOM.lbTabWritten.classList.remove("active");
        loadLeaderboard("practical");
      });
    }

    // Shield Decision Actions
    if (DOM.btnUseShieldDefense) DOM.btnUseShieldDefense.addEventListener("click", useShieldToPass);
    if (DOM.btnDeclineShield) DOM.btnDeclineShield.addEventListener("click", saveShieldAndFail);

    // Auth modal
    if (DOM.closeAuthModal) DOM.closeAuthModal.addEventListener("click", () => DOM.authModal && DOM.authModal.classList.add("hidden"));
    if (DOM.authToggleBtn) {
      DOM.authToggleBtn.addEventListener("click", () => {
        openAuthModal(state.authMode === "login" ? "register" : "login");
      });
    }
    if (DOM.authForm) DOM.authForm.addEventListener("submit", handleAuthSubmit);

    // Logo click resets to daily
    if (DOM.brandLogo) DOM.brandLogo.addEventListener("click", () => switchMode("daily"));

    // Search events
    if (DOM.searchSubmitBtn) {
      DOM.searchSubmitBtn.addEventListener("click", () => {
        if (DOM.searchInput) performSearch(DOM.searchInput.value);
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

    // v3.1.0 PWA Install & Guide Modal
    if (DOM.btnPwaInstall) {
      DOM.btnPwaInstall.addEventListener("click", () => openPwaGuideModal("android"));
    }
    if (DOM.btnClosePwaGuide) {
      DOM.btnClosePwaGuide.addEventListener("click", () => {
        if (DOM.modalPwaGuide) DOM.modalPwaGuide.classList.add("hidden");
      });
    }
    if (DOM.tabPwaAndroid) {
      DOM.tabPwaAndroid.addEventListener("click", () => switchPwaGuideTab("android"));
    }
    if (DOM.tabPwaIos) {
      DOM.tabPwaIos.addEventListener("click", () => switchPwaGuideTab("ios"));
    }
    if (DOM.btnPwaPromptTrigger) {
      DOM.btnPwaPromptTrigger.addEventListener("click", triggerPwaPrompt);
    }

    // v3.1.0 Inbox & Member Messaging Modals
    if (DOM.btnInbox) {
      DOM.btnInbox.addEventListener("click", () => openInboxModal());
    }
    if (DOM.btnCloseInbox) {
      DOM.btnCloseInbox.addEventListener("click", () => {
        if (DOM.modalInbox) DOM.modalInbox.classList.add("hidden");
      });
    }
    if (DOM.tabInboxAll) {
      DOM.tabInboxAll.addEventListener("click", () => loadInboxMessages("all"));
    }
    if (DOM.tabInboxReceived) {
      DOM.tabInboxReceived.addEventListener("click", () => loadInboxMessages("received"));
    }
    if (DOM.tabInboxSent) {
      DOM.tabInboxSent.addEventListener("click", () => loadInboxMessages("sent"));
    }
    if (DOM.btnInboxMarkAllRead) {
      DOM.btnInboxMarkAllRead.addEventListener("click", markAllMessagesRead);
    }
    if (DOM.btnInboxNewMsg) {
      DOM.btnInboxNewMsg.addEventListener("click", () => openSendMessageModal("전체 수험생", ""));
    }
    if (DOM.btnTogglePush) {
      DOM.btnTogglePush.addEventListener("click", handleTogglePush);
    }

    // Send Message Modal
    if (DOM.btnCloseSendMsg) {
      DOM.btnCloseSendMsg.addEventListener("click", () => {
        if (DOM.modalSendMessage) DOM.modalSendMessage.classList.add("hidden");
      });
    }
    if (DOM.btnCancelSendMsg) {
      DOM.btnCancelSendMsg.addEventListener("click", () => {
        if (DOM.modalSendMessage) DOM.modalSendMessage.classList.add("hidden");
      });
    }
    if (DOM.btnSendMsgSubmit) {
      DOM.btnSendMsgSubmit.addEventListener("click", handleSendMessageSubmit);
    }
    if (DOM.cheerChips && DOM.cheerChips.length > 0) {
      DOM.cheerChips.forEach((chip) => {
        chip.addEventListener("click", () => {
          if (DOM.msgContentInput) {
            DOM.msgContentInput.value = chip.textContent.trim();
            if (DOM.msgCharCount) DOM.msgCharCount.textContent = `${DOM.msgContentInput.value.length} / 200`;
            DOM.msgContentInput.focus();
          }
        });
      });
    }
    if (DOM.msgContentInput) {
      DOM.msgContentInput.addEventListener("input", () => {
        const len = DOM.msgContentInput.value.length;
        if (DOM.msgCharCount) DOM.msgCharCount.textContent = `${len} / 200`;
      });
    }

    // Incoming Message Modal
    if (DOM.btnCloseIncoming) {
      DOM.btnCloseIncoming.addEventListener("click", () => {
        if (DOM.modalIncomingMessage) DOM.modalIncomingMessage.classList.add("hidden");
      });
    }

    // 5 Mobile Lifecycle Watchers & Multitasking Persistence
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          saveActiveQuizSession();
        } else if (document.visibilityState === "visible") {
          checkAppVersionUpdate();
          checkDateTransition();
          updateResumeQuizBanner();
          checkUnreadMessages();
        }
      });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pageshow", () => {
        checkAppVersionUpdate();
        checkDateTransition();
        updateResumeQuizBanner();
        checkUnreadMessages();
      });
      window.addEventListener("focus", () => {
        checkAppVersionUpdate();
        checkDateTransition();
        updateResumeQuizBanner();
        checkUnreadMessages();
      });
      window.addEventListener("online", () => {
        checkAppVersionUpdate();
        syncWithServer();
        checkUnreadMessages();
      });
      window.addEventListener("pagehide", () => saveActiveQuizSession());
      window.addEventListener("beforeunload", () => saveActiveQuizSession());
      setInterval(() => checkAppVersionUpdate(), 3 * 60 * 1000);
      setInterval(() => checkDateTransition(), 60000);

      // Smart Polling for Unread Messages (every 4 seconds when tab is active)
      setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          checkUnreadMessages();
        }
      }, 4000);

      // Web Audio First-Touch Unlock
      const unlock = () => sound.unlockAudio();
      window.addEventListener("touchstart", unlock, { passive: true, once: true });
      window.addEventListener("pointerdown", unlock, { passive: true, once: true });
      window.addEventListener("click", unlock, { passive: true, once: true });
    }
  }

  // Initialize Application
  function init() {
    state.todayDateStr = getKSTDateString();
    state.lastLoadedDate = state.todayDateStr;
    if (DOM.todayDateTag) {
      DOM.todayDateTag.textContent = `📅 ${state.todayDateStr.replace(/-/g, ". ")}`;
    }

    loadLocalState();
    initEvents();
    initPwa();
    updateDashboardStats();
    updateShieldBadge();
    updateItemUI();
    updateResumeQuizBanner();
    loadDailyQuestions();
    loadQNetSchedule();
    loadChapterRegistry();
    checkAppVersionUpdate();
    checkUnreadMessages();
    updatePushToggleUI();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", init);
  }

  // Export for testing in Node.js
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      CURRENT_APP_VERSION,
      getKSTDateString,
      shuffleQuestionOptions,
      shuffleArray,
      selectUnsolvedFirstQuestions,
      recordQuestionSolved,
      saveActiveQuizSession,
      clearActiveQuizSession,
      restoreActiveQuizSession,
      awardShieldForConsecutivePerfect,
      processShieldDecision,
      useItem5050Logic,
      useItemHeartLogic,
      useItem2xLogic,
      useItemHintLogic,
      useItemCloverLogic,
      useItemTimemachineLogic,
      useItemMagnetLogic,
      LUCKY_BOX_REWARDS,
      rollLuckyBoxReward,
      isServerVersionNewer,
      checkDateTransition
    };
  }
})();
