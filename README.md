# ⚡ 하루전기 (Haru Elec)

> **매일 10문제로 완성하는 전기기사 필기 시험 데일리 퀴즈 & 스마트 오답노트 웹 애플리케이션**

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/mkotinet/HaruElec)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?style=for-the-badge&logo=docker)](docker-compose.yml)

---

## ⚡ 서비스 소개

**하루전기 (Haru Elec)**는 전기기사 필기 시험을 준비하는 수험생들을 위해 매일 5개 과목에서 균형 있게 2문제씩 총 10문제를 엄선 출제하고, 깊이 있는 단계별 풀이와 핵심 공식, 오답노트 복습 기능을 제공하는 모바일 최적화 웹 애플리케이션입니다.

- **원격 저장소**: [https://github.com/mkotinet/HaruElec](https://github.com/mkotinet/HaruElec)
- **외부 서비스 도메인**: `https://haruelec.danminlove.com`

---

## 🌟 주요 특징 및 기능

### 1. 📅 매일매일 새로운 오늘의 10문제 (Daily Challenge)
- 전기기사 5개 전 과목(전기자기학, 전력공학, 전기기기, 회로이론 및 제어공학, 전기설비기술기준)에서 각 2문제씩 매일 자정 자동 선정.
- 매일 10문제를 완주하면 오늘의 번개 출석 도장이 날인되고 연속 출석일수(Streak)가 누적됩니다.

### 2. 💡 충실한 단계별 해설 & KaTeX 수식 렌더링
- 단순 정답 표기가 아닌, **[핵심 공식]**, **[상세 풀이]**, **[보기별 오답 분석]**, **[암기 꿀팁]**을 완벽 수록.
- $\oint \mathbf{B}\cdot d\mathbf{l}$, $F = B I l \sin\theta$, 라플라스 변환 등 복잡한 전기 수식도 모바일에서 미려하게 렌더링.

### 3. 📝 스마트 오답노트 & 북마크
- 틀린 문제만 자동으로 오답노트에 수집되어 언제든 다시 풀기 가능.
- 헷갈리거나 중요한 문제는 별표(⭐)를 눌러 북마크 보관.

### 4. 👑 개인별 계정 및 클라우드 동기화
- 간편 아이디/비밀번호(SHA-256 암호화) 회원가입 및 로그인.
- 푼 문제, 정답률, 스트릭, 오답노트가 클라우드에 자동 동기화되며, 비로그인 상태에서도 브라우저 로컬스토리지로 100% 정상 작동.

### 5. 📚 과목별 집중 모드 & 📊 취약도 통계
- 취약한 특정 과목만 골라서 집중적으로 모의고사를 풀어볼 수 있는 과목별 연습 모드 지원.
- 과목별 정답률 바 차트로 나의 약점 과목을 한눈에 파악.

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
