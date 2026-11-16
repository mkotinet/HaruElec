# ⚡ 하루전기 (Haru Elec)

> **매일 10문제로 완성하는 전기기사 필기 시험 데일리 퀴즈 & KEC 최신 개정판 대조 분석, 스마트 오답노트 웹 애플리케이션**

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/mkotinet/HaruElec)
[![Version: 3.1.0](https://img.shields.io/badge/version-3.1.0-amber.svg?style=for-the-badge)](version.json)
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

### 7. 🔥 연속 라운드 무한 도전 시스템 (v2.0 New)
- 오늘의 10문제를 100점 만점으로 클리어 시 다음 라운드(새 10문제) 도전 버튼이 활성화됩니다.
- 결정적 시드 오프셋 알고리즘으로 중복 없이 5과목 균형 문제를 무한 라운드로 연속 도전할 수 있습니다.
- 만점 통과 시 +50P 보너스 포인트 및 `🔥 N라운드 돌파` 훈장이 부여됩니다.

### 8. 🏆 100% 실제 회원 기반 실시간 명예의 전당 (v2.0 New)
- 가상 더미 유저나 목(Mock) 데이터 없이, 영구 데이터베이스에 등록된 실제 회원들의 실시간 점수·스트릭·라운드 랭킹을 투명하게 제공합니다.

### 9. 🔀 퀴즈 선택지 동적 무작위화 (v2.0 New)
- Fisher-Yates 알고리즘을 통해 문제 출제 시마다 보기 순서를 동적으로 무작위 셔플하여 특정 번호 정답 편향을 완벽히 제거합니다. (정답 텍스트 무결성 100% 보장)

### 10. 🛡️ 시놀로지 NAS 보안 접속 감사 로깅 & 관리자 RBAC (v2.0 New)
- 회원가입, 로그인, 라운드 클리어 등 주요 활동을 KST 표준시, 클라이언트 IP, User-Agent와 함께 안전하게 로테이션 로깅합니다.
- 사이트 대표 관리자(`단민러브`) 전용 감사 로그 대시보드 모달을 제공하여 시스템 무결성을 안전하게 관리합니다.

### 11. 🛡️ 방패(Shield) 수호 시스템 & 의사결정 박스 (v2.1.0 New)
- 2연속 100점 만점 통과 시 방패 1개를 지급하며, 최대 2개 상한선(`Math.min(2, ...)`)이 엄격히 적용됩니다.
- 3연속 만점 신화 달성 시 특별 보너스 **+300P**가 지급됩니다.
- 라운드 탈락 위기 시 `#shieldDecisionBox`를 통해 방패를 소모하여 다음 라운드로 진출할지, 아니면 방패를 아끼고 오답 복습 모드로 전환할지 수험생이 직접 전략적으로 결정합니다.

### 12. ⚡ 3종 전기 퀴즈 찬스 아이템 (v2.1.0 New)
- **⚡ 50:50 전력 차단** (`eraser5050`): 현재 문제의 오답 보기 2개를 즉시 비활성화하여 정답 확률을 높입니다.
- **💖 절연 보호** (`heart`): 오답 선택 시 1회 면제되어 다른 보기를 다시 선택할 수 있는 기회를 부여합니다.
- **🚀 2배 부스터** (`booster2x`): 해당 라운드에서 획득하는 모든 점수가 2배로 적립됩니다.

### 13. 🎯 미풀이 문제 우선 출제 엔진 (v2.1.0 New)
- 수험생이 이미 푼 문제 ID를 추적하여 이전에 풀지 않은 미풀이 문제를 100% 우선 선별 출제합니다.
- 125제 전체를 풀이 완료하면 사이클이 자동 리셋되며, 매 출제 시 10문항 전체에 Fisher-Yates 무작위 셔플이 적용됩니다.

### 14. 📱 모바일 멀티태스킹 퀴즈 세션 영속성 & 자동 버전 갱신 (v2.1.0 New)
- 풀이 도중 카카오톡 확인이나 화면 꺼짐 시에도 퀴즈 상태가 실시간 직렬화되어 보존되며, 홈 화면의 `[⚡ 풀던 10문제 이어하기]` 배너로 즉시 복원됩니다.
- 5대 브라우저 라이프사이클 훅(`visibilitychange`, `pageshow`, `focus`, `online`, 주기적 타이머)을 통해 서버의 최신 배포를 실시간 감지하여 자동 갱신합니다.
- First-Touch 제스처를 통한 Web Audio API 오디오 자동 언락 및 모바일 헤더 텍스트 줄바꿈 방지 스타일이 적용되었습니다.

### 15. 🏆 250제 기출문제 은행 & 5단계 난이도 등급제 (v3.0.0 New)
- 필기 200문항(과목당 40문항 균형) + 실기 단답형 50문항 총 250문항 완성.
- 1단계(입문)부터 5단계(고난도 계산)까지 수험생 수준별 맞춤 5문항 출제 및 연속 라운드 회전.
- 필기 vs 실기 듀얼 트랙 랭킹 분리 지원.

### 16. 🎁 7종 인게임 찬스 아이템 & 깜짝 럭키 박스 (v3.0.0 New)
- 50:50 전력 차단기, 비상 발전기, 2배 승압기, 공식 계측기(힌트), 통전 클로버, 리셋 스위치, 전자석 콤보 등 7종 아이템.
- 매 3라운드 클리어 시 100% 당첨 럭키 박스(방패 상한 2개 초과 시 +100P 대체 지급) 드롭.

### 17. 📅 Q-Net 국가기술자격 2026/2027 정기 시험일정 실시간 D-Day (v3.0.0 New)
- 공공데이터포털 및 Q-Net API 연동으로 필기/실기 원서접수, 시험일, 합격자 발표 D-Day 자동 계산 및 대시보드 위젯 표출.

### 18. 💌 회원 간 실시간 메시지 송부 & 웹 푸시 알림 (v3.1.0 New)
- 수험생 간 원클릭 응원 및 질문 메시지 교환 (6종 전기 특화 빠른 응원 칩, 200자 제한, XSS 방어, 1,000건 자동 로테이션).
- 우체통 모달(`#modalInbox`), 미확인 펄스 뱃지, 실시간 스마트 폴링(4초) 및 도착 즉시 차임 사운드 + 팝업 알림.
- 순수 crypto 기반 P-256 ECDSA VAPID 키페어 발급 및 W3C Web Push OS 네이티브 알림 지원.

### 19. 📲 PWA 독립 실행 & 모바일 완제품 바이너리 다운로드 (v3.1.0 New)
- W3C Web App Manifest (`manifest.json`) 및 Service Worker v3.1.0 오프라인 캐시 탑재.
- Android: 크롬 브라우저 1초 원클릭 앱 설치 + 완제품 `HaruElec-v3.1.0-release.apk` (0.44MB) 직접 다운로드.
- iOS: Safari 브라우저 "홈 화면에 추가" 무인증서 0초 네이티브 구동 + `HaruElec-v3.1.0.ipa` (0.40MB) 다운로드 및 사이드로딩 안내.

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
