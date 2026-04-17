# 디자인 문서: AI 결정 도우미

## 디자인 컨셉

프리미엄 다크 UI.
- 딥 다크 배경 + 골드/앰버 포인트 컬러
- 카드 기반 레이아웃, 부드러운 그림자와 테두리
- 모바일 퍼스트, 심플하고 직관적인 UX

---

## 컬러 시스템

| 역할 | 값 | 설명 |
|---|---|---|
| Background | `#0D0D0D` | 최상위 배경 |
| Surface | `#1A1A1A` | 카드/컨테이너 배경 |
| Surface Elevated | `#242424` | 입력 필드, 선택 영역 |
| Border | `#2E2E2E` | 구분선, 테두리 |
| Primary (Gold) | `#C9A84C` | 주요 버튼, 강조 텍스트 |
| Primary Hover | `#E0BF6A` | 버튼 호버 상태 |
| Primary Dim | `#C9A84C1A` | 골드 배경 틴트 |
| Text Primary | `#F5F0E8` | 주요 텍스트 |
| Text Secondary | `#9A9A9A` | 보조 텍스트, 레이블 |
| Text Muted | `#5A5A5A` | 비활성 텍스트 |
| Success | `#4CAF82` | 성공 상태 |
| Error | `#E05C5C` | 오류 상태 |

---

## 타이포그래피

- 폰트: `Pretendard` (CDN) → fallback: `Apple SD Gothic Neo`, `sans-serif`
- 제목: 24px / weight 700
- 서브타이틀: 14px / weight 400 / Text Secondary
- 레이블: 12px / weight 500 / Text Secondary / letter-spacing 0.08em / uppercase
- 본문: 15px / weight 400
- 추천 결과 강조: 20px / weight 600 / Gold

---

## 레이아웃 구조

```
┌─────────────────────────────────────┐
│           Header (로고 + 타이틀)      │
│           AI 배너 (엔진 상태)         │
├─────────────────────────────────────┤
│   ┌─────────────────────────────┐   │
│   │     Input Card              │   │
│   │  섹션: 신체·컨디션           │   │
│   │    피로도 / 수면 / 식사      │   │
│   │  섹션: 감정·심리             │   │
│   │    기분 / 스트레스           │   │
│   │  섹션: 환경·상황             │   │
│   │    날씨 / 시간 / 예산 / 동행 │   │
│   │  섹션: 목적·원하는 것        │   │
│   │    활동유형 / 장소선호       │   │
│   │  섹션: 추가 입력 (textarea)  │   │
│   │  [ AI 분석 시작 버튼 ]       │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │     Result Card (조건부)    │   │
│   │  최적 추천 텍스트            │   │
│   │  관련 이미지 (3장 그리드)    │   │
│   │  분석 이유                   │   │
│   │  관련 유튜브 링크            │   │
│   │  ─────────────────          │   │
│   │  다른 선택지 (대안 2개)      │   │
│   │  ─────────────────          │   │
│   │  주변 추천 장소 (Leaflet 지도)│   │
│   │  장소 목록                   │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  Error Card (조건부)        │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

최대 너비: 480px (모바일 중심), 중앙 정렬

---

## 컴포넌트 상세

### Header
- 로고 아이콘: ✦ (골드 SVG 심볼)
- 타이틀: "AI 결정 도우미"
- 서브: "지금 상태를 알려주시면 AI가 최적의 행동을 분석해드려요"

### AI 배너
- 엔진 상태 표시: "Groq AI · llama3-8b-8192 분석 준비 완료"
- 좌측 점 인디케이터 (애니메이션)

### Input Card
- 입력 필드를 4개 섹션으로 그룹화:
  1. 신체·컨디션: 피로도, 수면 상태, 식사 여부
  2. 감정·심리: 기분, 스트레스
  3. 환경·상황: 날씨, 여유 시간, 예산, 동행
  4. 목적·원하는 것: 원하는 활동, 장소 선호
- 자유 입력 textarea (extra_note): 최대 200자, 실시간 글자 수 표시
- 드롭다운 그리드: 2열 배치

#### 추천받기 버튼
- 텍스트: "AI 분석 시작"
- 로딩 상태: 스피너 + "분석 중..." 텍스트
- 비활성 시: opacity 0.6, cursor not-allowed

### Result Card
- 초기: hidden
- 표시 조건: 추천 API 성공 응답 수신 시
- 섹션 구성:
  1. 최적 추천 (recommendation 텍스트)
  2. 관련 이미지 (3열 그리드, 스켈레톤 로딩)
  3. 분석 이유 (reason 텍스트)
  4. 관련 유튜브 링크 (keyword 기반 검색 URL)
  5. 다른 선택지 (alternatives 2개)
  6. 주변 추천 장소 (Leaflet 지도 + 장소 목록)

### 지도 (Leaflet)
- 타일: OpenStreetMap
- 내 위치 마커: 골드 원형
- 장소 마커: 흰색 원형 (골드 테두리)
- 위치 권한 거부 시: 서울 시청(37.5665, 126.9780) fallback
- 반경: 2km

### Error Card
- 초기: hidden
- 표시 조건: API 오류 또는 클라이언트 검증 실패 시

---

## 파일 구조

```
project/
├── server/
│   ├── index.js              # Express 서버 진입점
│   ├── selector.js           # Engine_Selector
│   ├── routes/
│   │   ├── recommend.js      # POST /api/recommend, GET /api/health
│   │   ├── images.js         # GET /api/images (Unsplash 프록시)
│   │   └── places.js         # GET /api/places (Overpass OSM 프록시)
│   ├── engines/
│   │   ├── interface.js      # Recommendation_Engine 인터페이스 (JSDoc)
│   │   ├── ruleEngine.js     # Rule_Based_Engine
│   │   └── aiEngine.js       # AI_Based_Engine (Groq)
│   └── middleware/
│       └── validator.js      # Input_Validator
├── public/
│   ├── index.html            # 메인 HTML
│   ├── style.css             # 전체 스타일
│   └── app.js                # 프론트엔드 JS
├── .env                      # 환경변수 (gitignore)
├── .env.example              # 환경변수 예시
├── .gitignore
└── package.json
```

---

## 인터랙션 플로우

```
사용자 접속
    │
    ▼
페이지 로드 시 위치 권한 미리 요청
    │
    ▼
Input Card 표시 (11개 드롭다운 + textarea)
    │
    ▼
사용자가 항목 선택 (최소 1개 필수)
    │
    ▼
"AI 분석 시작" 클릭
    │
    ├─ 버튼 비활성화 + "분석 중..." 표시
    │
    ▼
POST /api/recommend
    │
    ├─ 성공 → Result Card 표시
    │         ├─ 추천/이유/대안 렌더링
    │         ├─ GET /api/images (image_keyword)
    │         ├─ 유튜브 링크 생성 (keyword)
    │         └─ GET /api/places (위치 + keyword)
    │              └─ Leaflet 지도 + 장소 목록 렌더링
    │
    └─ 실패 → Error Card 표시
```

---

## 반응형

- 모바일 (< 480px): 단일 컬럼, 드롭다운 1열
- 태블릿/데스크탑 (≥ 480px): 카드 중앙 정렬, 드롭다운 2열 유지
