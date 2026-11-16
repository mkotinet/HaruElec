const fs = require('fs');
const path = require('path');

const existingQuestions = require('../data/questions.json');

const levelNames = {
  1: '입문/기초',
  2: '개념/필수',
  3: '기출/응용',
  4: '심화/계산',
  5: '고난도/실무'
};

// 1. Upgrade existing 125 questions
const upgraded = existingQuestions.map((q, idx) => {
  let lvl = ((idx % 5) + 1);
  if (q.kec_revision && q.kec_revision.is_revised) {
    lvl = (idx % 2 === 0) ? 5 : 4;
  }
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

let currentId = 126;

function makeQ(subject_id, subject, question, options, answer, official_source, explanation, year, level, hint, exam_track = 'written', kec_revision = null) {
  const item = {
    id: currentId++,
    subject_id,
    subject,
    question,
    options,
    answer,
    official_source,
    explanation,
    year,
    level,
    level_name: levelNames[level],
    hint,
    exam_track
  };
  if (kec_revision) {
    item.kec_revision = kec_revision;
  }
  return item;
}

// Subject 1 (15 items)
const sub1Func = require('./questions_sub1_data.js');
const sub1 = sub1Func(makeQ);

// Subject 2 (15 items)
const sub2Func = require('./questions_sub2.js');
const sub2 = sub2Func(makeQ);

// Subject 3 (15 items)
const sub3Func = require('./questions_sub3.js');
const sub3 = sub3Func(makeQ);

// Subject 4 (15 items)
const sub4Func = require('./questions_sub4.js');
const sub4 = sub4Func(makeQ);

// Subject 5 (15 items)
const sub5Func = require('./questions_sub5.js');
const sub5 = sub5Func(makeQ);

// Subject 6 Practical (50 items)
const sub6Func = require('./questions_sub6_practical.js');
const sub6 = sub6Func(makeQ);

const allQuestions = [
  ...upgraded,
  ...sub1,
  ...sub2,
  ...sub3,
  ...sub4,
  ...sub5,
  ...sub6
];

console.log('Total questions built:', allQuestions.length);
console.log('Written track count:', allQuestions.filter(q => q.exam_track === 'written').length);
console.log('Practical track count:', allQuestions.filter(q => q.exam_track === 'practical').length);
console.log('KEC Revised count:', allQuestions.filter(q => q.kec_revision && q.kec_revision.is_revised).length);

const outPath = path.join(__dirname, '..', 'data', 'questions.json');
fs.writeFileSync(outPath, JSON.stringify(allQuestions, null, 2), 'utf8');
console.log('Successfully wrote', allQuestions.length, 'questions to', outPath);
