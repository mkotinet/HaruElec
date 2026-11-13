# ⚡ 하루전기 (Haru Elec)

> **매일 10문제로 완성하는 전기기사 필기 시험 데일리 퀴즈 & KEC 최신 개정판 대조 분석, 스마트 오답노트 웹 애플리케이션**

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/mkotinet/HaruElec)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=for-the-badge&logo=docker)](docker-compose.yml)

---

## ⚡ 서비스 소개

**하루전기 (Haru Elec)**는 전기기사 필기 수험생을 위해 한국산업인력공단(Q-Net) 공식 출제기준과 대한전기협회 한국전기설비규정(KEC) 최신 개정판을 완벽히 수용하여, 매일 5개 과목에서 균형 있게 2문제씩 총 10문제를 엄선 출제하고, **구 기준(❌) vs 최신 KEC 개정 규정(✅)** 1:1 대조 비교 해설, 125제 전문 키워드 검색 엔진, 스마트 오답노트 복습 기능을 제공하는 모바일 반응형 웹 애플리케이션입니다.

- **원격 저장소**: [https://github.com/mkotinet/HaruElec](https://github.com/mkotinet/HaruElec)
- **외부 서비스 도메인**: `https://elec.danminlove.com` / `https://haruelec.danminlove.com`

---

## 🌟 주요 특징 및 기능

### 1. 🔥 한국전기설비규정(KEC) 최신 개정판 1:1 대조 비교 (KEC Diff Viewer)
- 종전 기술기준(구 규정 ❌)과 최신 KEC 개정 규정(✅)을 직관적으로 대조하는 전용 Diff Card를 해설에 탑재.
- 저압 전압 범위 상향(AC 1,000V, DC 1,500V), 전선 색상(갈/흑/회/청/녹황), 종별 접지 폐지 및 TN-S/TN-C/TT/IT 계통접지, 절연저항 1.0MΩ 기준, 지중선로 1.0m 매설 깊이, CD관 은폐장소 노출 금지, SPD(서지보호장치) 의무화 등 총 19개 핵심 개정 조항 완벽 수록.

### 2. 📅 매일매일 새로운 오늘의 10문제 (Daily Challenge)
- 전기기사 5개 전 과목(전기자기학, 전력공학, 전기기기, 회로이론 및 제어공학, 전기설비기술기준)에서 각 2문제씩 매일 자정 자동 선정.
- 매일 10문제를 완주하면 오늘의 번개 출석 도장이 날인되고 연속 출석일수(Streak)가 누적됩니다.

### 3. 🔍 125제 전체 문제은행 실시간 키워드 검색
- 상단 `[🔍 문제 검색]` 탭을 통해 문제 본문, 공식 출처, 상세 풀이, 오답 분석, KEC 개정 주제를 실시간으로 검색하여 필요한 개념을 즉시 학습 가능.

### 4. 💡 Q-Net 공식 출제기준 매핑 & 충실한 4단계 해설
- 모든 문항에 한국산업인력공단(Q-Net) 출제기준 장·절 출처 배지 표기.
- **[공식 출처]**, **[핵심 공식/개념]**, **[상세 풀이]**, **[오답 보기 분석]** 4단계 해설 포맷 및 KaTeX 수식 미려 렌더링.

### 5. 📝 스마트 오답노트 & 북마크
- 틀린 문제만 자동으로 오답노트에 수집되어 언제든 다시 풀기 가능.
- 헷갈리거나 중요한 문제는 별표(⭐)를 눌러 북마크 보관.

### 6. 👑 개인별 계정 및 클라우드 동기화
- 간편 아이디/비밀번호(SHA-256 암호화) 회원가입 및 로그인.
- 푼 문제, 정답률, 스트릭, 오답노트가 클라우드에 자동 동기화되며, 비로그인 상태에서도 브라우저 로컬스토리지로 100% 정상 작동.

---

## 🚀 빠른 시작 (로컬 실행)

```bash
# 레포지토리 클론
git clone https://github.com/mkotinet/HaruElec.git
cd HaruElec

# 서버 실행 (외부 npm 패키지 설치 필요 없음)
npm start
# 또는
node server.js

# 테스트 실행
npm test
```
브라우저에서 `http://localhost` 또는 `http://localhost:8091`로 접속합니다.

---

## 🐳 Synology NAS Portainer 도커 배포

```yaml
version: "3.8"

services:
  haruelec:
    image: node:20-alpine
    container_name: haruelec
    restart: unless-stopped
    ports:
      - "8091:80"
    volumes:
      - haruelec_data:/app/data
    environment:
      - PORT=80
    command: >
      /bin/sh -c "
        apk add --no-cache git &&
        git config --global user.name 'mkotinet' &&
        git config --global user.email 'mkotinet@users.noreply.github.com' &&
        rm -rf /app_src &&
        git clone https://github.com/mkotinet/HaruElec.git /app_src &&
        cd /app_src &&
        node server.js
      "
    networks:
      - npm_default

volumes:
  haruelec_data:

networks:
  npm_default:
    external: true
```
