const fs = require('fs');
const path = require('path');

const existingQuestions = require('../data/questions.json');

// Map levels evenly or logically across existing 125 questions
// 1: 입문/기초, 2: 개념/필수, 3: 기출/응용, 4: 심화/계산, 5: 고난도/실무
const levelNames = {
  1: '입문/기초',
  2: '개념/필수',
  3: '기출/응용',
  4: '심화/계산',
  5: '고난도/실무'
};

// 1. Upgrade existing 125 questions with level, level_name, hint, exam_track
const upgradedExisting = existingQuestions.map((q, idx) => {
  // Distribute levels 1~5 based on question content or index
  let lvl = ((idx % 5) + 1);
  if (q.kec_revision && q.kec_revision.is_revised) {
    lvl = (idx % 2 === 0) ? 5 : 4; // KEC revisions are advanced/practical
  }

  // Generate hint from explanation or question if not already present
  let hint = q.hint;
  if (!hint) {
    if (q.explanation.includes('【공식 출처】')) {
      const match = q.explanation.match(/【공식 출처】\s*([^\n]+)/);
      hint = match ? match[1].trim() : '핵심 공식 및 원리를 적용하세요.';
    } else {
      hint = '기본 공식과 단위에 유의하여 풀이하세요.';
    }
  }

  return {
    ...q,
    level: lvl,
    level_name: levelNames[lvl],
    hint: hint,
    exam_track: 'written'
  };
});

console.log('Upgraded existing:', upgradedExisting.length);

