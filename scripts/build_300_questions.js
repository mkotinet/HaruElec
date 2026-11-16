const fs = require('fs');
const path = require('path');

const existing250 = require('../data/questions.json');
const add50Func = require('./questions_add_50.js');

const levelNames = {
  1: '입문/기초',
  2: '개념/필수',
  3: '기출/응용',
  4: '심화/계산',
  5: '고난도/실무'
};

let currentId = 251;

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
    level_name: levelNames[level] || '개념/필수',
    hint,
    exam_track
  };
  if (kec_revision) {
    item.kec_revision = kec_revision;
  }
  return item;
}

const new50 = add50Func(makeQ);
const allQuestions = [...existing250, ...new50];

// Normalize sub_subject, chapter_id, and chapter_name
const normalized = allQuestions.map((q) => {
  let subSubject = q.subject;
  let chId = 1;
  let chName = '기초 핵심 개념';

  const src = q.official_source || '';

  if (q.subject_id === 1) {
    subSubject = '전기자기학';
    if (src.includes('1장') || src.includes('정전계') || src.includes('쿨롱') || src.includes('전위')) {
      chId = 1; chName = '제1장 정전계 및 전위';
    } else if (src.includes('2장') || src.includes('도체계') || src.includes('정전용량') || src.includes('콘덴서')) {
      chId = 2; chName = '제2장 도체계와 정전용량';
    } else if (src.includes('3장') || src.includes('유전체') || src.includes('분극')) {
      chId = 3; chName = '제3장 유전체와 경계조건';
    } else if (src.includes('4장') || src.includes('전기영상') || src.includes('자기력')) {
      chId = 4; chName = '제4장 전기영상법과 자기력';
    } else if (src.includes('5장') || src.includes('전류의 자기') || src.includes('자계') || src.includes('솔레노이드')) {
      chId = 5; chName = '제5장 전류의 자기작용과 정자기장';
    } else if (src.includes('6장') || src.includes('자성체') || src.includes('자기회로') || src.includes('히스테리시스')) {
      chId = 6; chName = '제6장 자성체와 자기회로';
    } else if (src.includes('7장') || src.includes('전자유도')) {
      chId = 7; chName = '제7장 전자유도와 유도기전력';
    } else if (src.includes('8장') || src.includes('인덕턴스')) {
      chId = 8; chName = '제8장 인덕턴스와 자기에너지';
    } else if (src.includes('9장') || src.includes('전자계') || src.includes('전자파') || src.includes('맥스웰') || src.includes('포인팅')) {
      chId = 9; chName = '제9장 전자계와 전자파';
    } else {
      chId = 1; chName = '제1장 정전계';
    }
  } else if (q.subject_id === 2) {
    subSubject = '전력공학';
    if (src.includes('1장') || src.includes('송전선로') || src.includes('코로나') || src.includes('복도체') || src.includes('가선') || src.includes('이도')) {
      chId = 1; chName = '제1장 송전선로 특성 및 선로정수';
    } else if (src.includes('2장') || src.includes('송전특성') || src.includes('장거리') || src.includes('전력원선도') || src.includes('안정도') || src.includes('전압조정')) {
      chId = 2; chName = '제2장 송전특성 및 전력원선도·안정도';
    } else if (src.includes('3장') || src.includes('중성점') || src.includes('소호리액터') || src.includes('접지방식')) {
      chId = 3; chName = '제3장 중성점 접지방식';
    } else if (src.includes('4장') || src.includes('조상설비') || src.includes('보호계전')) {
      chId = 4; chName = '제4장 조상설비 및 보호계전방식';
    } else if (src.includes('5장') || src.includes('고장계산') || src.includes('단락용량') || src.includes('대칭좌표')) {
      chId = 5; chName = '제5장 고장계산 및 대칭좌표법';
    } else if (src.includes('6장') || src.includes('이상전압') || src.includes('피뢰기') || src.includes('진행파')) {
      chId = 6; chName = '제6장 이상전압과 피뢰설비';
    } else if (src.includes('7장') || src.includes('배전선로') || src.includes('부하특성') || src.includes('수용률')) {
      chId = 7; chName = '제7장 배전선로 구조 및 부하특성';
    } else if (src.includes('8장') || src.includes('수력발전')) {
      chId = 8; chName = '제8장 수력발전설비';
    } else if (src.includes('9장') || src.includes('화력발전') || src.includes('사이클')) {
      chId = 9; chName = '제9장 화력발전설비 및 증기사이클';
    } else if (src.includes('10장') || src.includes('원자력')) {
      chId = 10; chName = '제10장 원자력 발전설비';
    } else {
      chId = 1; chName = '제1장 송전선로 특성';
    }
  } else if (q.subject_id === 3) {
    subSubject = '전기기기';
    if (src.includes('1장') || src.includes('직류기') || src.includes('직류전동기') || src.includes('전기자 반작용')) {
      chId = 1; chName = '제1장 직류기 (발전기·전동기)';
    } else if (src.includes('2장') || src.includes('동기기') || src.includes('동기발전기') || src.includes('단락비') || src.includes('V곡선') || src.includes('난조')) {
      chId = 2; chName = '제2장 동기기 (발전기·전동기)';
    } else if (src.includes('3장') || src.includes('유도기') || src.includes('유도전동기') || src.includes('슬립') || src.includes('비례추이') || src.includes('기동법')) {
      chId = 3; chName = '제3장 유도기 (3상·단상 유도전동기)';
    } else if (src.includes('4장') || src.includes('변압기') || src.includes('결선') || src.includes('효율') || src.includes('등가회로')) {
      chId = 4; chName = '제4장 변압기 (특성·결선·병렬운전)';
    } else if (src.includes('5장') || src.includes('정류기') || src.includes('전력전자') || src.includes('SCR') || src.includes('반도체') || src.includes('인버터')) {
      chId = 5; chName = '제5장 전력전자 및 정류회로';
    } else if (src.includes('6장') || src.includes('특수 전동기')) {
      chId = 6; chName = '제6장 특수 전동기 및 제어용 기기';
    } else {
      chId = 1; chName = '제1장 직류기';
    }
  } else if (q.subject_id === 4) {
    // Subject 4: Split into "제어공학" and "회로이론"
    if (src.includes('제어공학') || src.includes('제어계') || src.includes('루스') || src.includes('나이퀴스트') || src.includes('근궤적') || src.includes('보드선도') || src.includes('신호흐름') || src.includes('상태공간') || src.includes('z변환') || src.includes('메이슨')) {
      subSubject = '제어공학';
      if (src.includes('1장') || src.includes('제어계의 분류') || src.includes('피드백') || src.includes('전달함수의 정의')) {
        chId = 1; chName = '제1장 제어계의 분류 및 전달함수';
      } else if (src.includes('2장') || src.includes('블록선도') || src.includes('신호흐름선도') || src.includes('메이슨')) {
        chId = 2; chName = '제2장 블록선도와 신호흐름선도';
      } else if (src.includes('3장') || src.includes('시간응답') || src.includes('과도응답') || src.includes('정상상태 오차') || src.includes('감쇠비')) {
        chId = 3; chName = '제3장 제어계의 시간응답 및 과도특성';
      } else if (src.includes('4장') || src.includes('안정도') || src.includes('루스') || src.includes('나이퀴스트')) {
        chId = 4; chName = '제4장 시스템의 안정도 판별법';
      } else if (src.includes('5장') || src.includes('주파수응답') || src.includes('보드선도') || src.includes('위상여유')) {
        chId = 5; chName = '제5장 주파수 응답 및 보드선도';
      } else if (src.includes('6장') || src.includes('근궤적')) {
        chId = 6; chName = '제6장 근궤적법';
      } else if (src.includes('7장') || src.includes('상태공간') || src.includes('샘플치') || src.includes('z변환')) {
        chId = 7; chName = '제7장 상태공간법 및 디지털 제어';
      } else {
        chId = 3; chName = '제3장 제어계의 시간응답';
      }
    } else {
      subSubject = '회로이론';
      if (src.includes('1장') || src.includes('직류') || src.includes('옴의 법칙') || src.includes('중첩')) {
        chId = 1; chName = '제1장 교류회로 기초 및 회로망 정리';
      } else if (src.includes('2장') || src.includes('교류') || src.includes('임피던스') || src.includes('전력')) {
        chId = 2; chName = '제2장 교류 전력 및 RLC 회로';
      } else if (src.includes('3장') || src.includes('공진') || src.includes('과도현상')) {
        chId = 3; chName = '제3장 공진회로 및 직류 과도현상';
      } else if (src.includes('4장') || src.includes('3상') || src.includes('2전력계법') || src.includes('대칭좌표')) {
        chId = 4; chName = '제4장 대칭 3상 교류회로';
      } else if (src.includes('5장') || src.includes('비정현파') || src.includes('라플라스 변환 공식') || src.includes('단위계단')) {
        chId = 5; chName = '제5장 비정현파 교류 및 파형 해석';
      } else if (src.includes('6장') || src.includes('4단자망') || src.includes('구동점')) {
        chId = 6; chName = '제6장 4단자망 파라미터';
      } else if (src.includes('7장') || src.includes('라플라스') || src.includes('분포정수')) {
        chId = 7; chName = '제7장 라플라스 변환 및 분포정수회로';
      } else {
        chId = 1; chName = '제1장 교류회로 기초';
      }
    }
  } else if (q.subject_id === 5) {
    subSubject = '전기설비기술기준(KEC)';
    if (src.includes('111') || src.includes('121') || src.includes('132') || src.includes('140') || src.includes('142') || src.includes('143') || src.includes('151') || src.includes('153') || src.includes('총칙') || src.includes('접지시스템') || src.includes('전선의 식별') || src.includes('전압의 구분') || src.includes('절연저항')) {
      chId = 1; chName = '제1장 총칙 및 접지·피뢰설비 (KEC 100)';
    } else if (src.includes('211') || src.includes('212') || src.includes('221') || src.includes('232') || src.includes('저압') || src.includes('과전류') || src.includes('감전') || src.includes('합성수지관') || src.includes('금속관') || src.includes('케이블트레이') || src.includes('누전차단기')) {
      chId = 2; chName = '제2장 저압 전기설비 및 배선공사 (KEC 200)';
    } else if (src.includes('331') || src.includes('332') || src.includes('333') || src.includes('334') || src.includes('351') || src.includes('고압') || src.includes('특고압') || src.includes('가공전선로') || src.includes('지중전선로') || src.includes('철탑') || src.includes('풍압하중') || src.includes('지선')) {
      chId = 3; chName = '제3장 고압·특고압 및 전선로 시설 (KEC 300)';
    } else if (src.includes('400') || src.includes('전기철도')) {
      chId = 4; chName = '제4장 전기철도설비 (KEC 400)';
    } else if (src.includes('503') || src.includes('511') || src.includes('520') || src.includes('521') || src.includes('분산형') || src.includes('태양광') || src.includes('전기자동차')) {
      chId = 5; chName = '제5장 분산형 전원 및 특수설비 (KEC 500)';
    } else {
      chId = 1; chName = '제1장 총칙 및 접지설비 (KEC 100)';
    }
  } else if (q.subject_id === 6) {
    subSubject = '실기 전기설비설계 및 관리';
    if (src.includes('1장') || src.includes('수변전') || src.includes('변성기') || src.includes('차단기') || src.includes('변압기') || src.includes('피뢰기') || src.includes('부하율') || src.includes('MOF') || src.includes('축전지') || src.includes('LBS') || src.includes('단락용량')) {
      chId = 1; chName = '제1장 수변전설비 용량산정 및 기기운전';
    } else if (src.includes('2장') || src.includes('시퀀스') || src.includes('정역제어') || src.includes('Y-Δ') || src.includes('논리회로') || src.includes('PLC') || src.includes('타이머')) {
      chId = 2; chName = '제2장 시퀀스 제어 및 PLC';
    } else if (src.includes('3장') || src.includes('조명') || src.includes('실지수') || src.includes('배선설계') || src.includes('전압강하') || src.includes('분기회로') || src.includes('간선')) {
      chId = 3; chName = '제3장 조명설계 및 옥내배선설비';
    } else if (src.includes('4장') || src.includes('접지저항') || src.includes('보폭전압') || src.includes('감리') || src.includes('안전관리자') || src.includes('점검')) {
      chId = 4; chName = '제4장 수변전 기기 점검 및 측정·감리';
    } else if (src.includes('KEC') || src.includes('TT 계통') || src.includes('PEN') || src.includes('보호도체')) {
      chId = 5; chName = '제5장 KEC 실기 계산 및 규정';
    } else {
      chId = 1; chName = '제1장 수변전설비';
    }
  }

  return {
    ...q,
    sub_subject: subSubject,
    chapter_id: chId,
    chapter_name: chName
  };
});

fs.writeFileSync(path.join(__dirname, '../data/questions.json'), JSON.stringify(normalized, null, 2), 'utf8');

console.log(`✅ Built 300 questions successfully!`);

// Statistics summary
const stats = {};
normalized.forEach(q => {
  const key = `[과목${q.subject_id}] ${q.sub_subject} - ${q.chapter_name}`;
  stats[key] = (stats[key] || 0) + 1;
});
console.log('Chapter distribution:', stats);
