# 디자인 문서: AI 결정 도우미

## 디자인 컨셉

캐치테이블(CatchTable) 스타일을 참고한 프리미엄 다크 UI.
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

- 폰트: `Pretendard` (한국어 최적화) → fallback: `Apple SD Gothic Neo`, `sans-serif`
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
├─────────────────────────────────────┤
│                                     │
│   ┌─────────────────────────────┐   │
│   │     Input Card              │   │
│   │  ┌──────┐  ┌──────┐        │   │
│   │  │피로도 │  │시간  │        │   │
│   │  └──────┘  └──────┘        │   │
│   │  ┌──────┐  ┌──────┐        │   │
│   │  │날씨  │  │예산  │        │   │
│   │  └──────┘  └──────┘        │   │
│   │  ┌──────────────────┐      │   │
│   │  │      기분         │      │   │
│   │  └──────────────────┘      │   │
│   │  [ 추천받기 버튼 ]           │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │     Result Card (조건부)    │   │
│   │  ✦ 추천 행동 (골드 강조)    │   │
│   │  추천 이유 텍스트            │   │
│   │  ─────────────────          │   │
│   │  대안 1 / 대안 2            │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

최대 너비: 480px (모바일 중심), 중앙 정렬

---

## 컴포넌트 상세

### Header
- 배경: `#0D0D0D`
- 로고 아이콘: ✦ (골드 심볼)
- 타이틀: "AI 결정 도우미" (24px, Text Primary)
- 서브: "지금 당신에게 딱 맞는 행동을 추천해드려요" (14px, Text Secondary)
- 하단 구분선: 1px solid Border

### Input Card
- 배경: `#1A1A1A`
- border-radius: 16px
- border: 1px solid `#2E2E2E`
- padding: 24px
- box-shadow: `0 4px 24px rgba(0,0,0,0.4)`

#### 드롭다운 필드
- 레이블: 12px uppercase letter-spacing, Text Secondary
- select 박스:
  - 배경: `#242424`
  - border: 1px solid `#2E2E2E`
  - border-radius: 10px
  - padding: 12px 16px
  - color: Text Primary
  - 포커스 시: border-color `#C9A84C`, box-shadow `0 0 0 2px rgba(201,168,76,0.2)`
- 그리드: 2열 (피로도/시간, 날씨/예산), 기분은 1열 전체

#### 추천받기 버튼
- 배경: `#C9A84C`
- color: `#0D0D0D`
- border-radius: 12px
- padding: 14px
- font-size: 15px / weight 600
- width: 100%
- 호버: `#E0BF6A`, transform: translateY(-1px)
- 비활성(로딩): opacity 0.6, cursor not-allowed
- 로딩 상태: 스피너 아이콘 + "분석 중..." 텍스트

### Result Card
- 초기: 숨김 (display: none)
- 표시 시: fade-in 애니메이션 (0.3s ease)
- 배경: `#1A1A1A`
- border: 1px solid `#C9A84C33`
- border-radius: 16px
- padding: 24px

#### 추천 행동 섹션
- 상단 레이블: "✦ 오늘의 추천" (12px, Gold, uppercase)
- 추천 텍스트: 20px / weight 600 / Text Primary
- 배경 블록: `#C9A84C0D` (골드 틴트), border-radius 10px, padding 16px

#### 추천 이유 섹션
- 레이블: "추천 이유" (12px, Text Secondary, uppercase)
- 본문: 14px / Text Secondary / line-height 1.7

#### 구분선
- 1px solid `#2E2E2E`

#### 대안 섹션
- 레이블: "다른 선택지" (12px, Text Secondary, uppercase)
- 대안 아이템:
  - 배경: `#242424`
  - border-radius: 8px
  - padding: 10px 14px
  - 앞에 번호 뱃지 (골드 원형)

### Error State
- border-color: `#E05C5C33`
- 에러 아이콘 + 메시지 텍스트 (Error 컬러)

---

## 파일 구조

```
project/
├── server/
│   ├── index.js              # Express 서버 진입점
│   ├── routes/
│   │   └── recommend.js      # POST /api/recommend, GET /api/health
│   ├── engines/
│   │   ├── interface.js      # Recommendation_Engine 인터페이스 정의
│   │   ├── ruleEngine.js     # Rule_Based_Engine
│   │   └── aiEngine.js       # AI_Based_Engine (Groq)
│   ├── middleware/
│   │   └── validator.js      # Input_Validator
│   └── selector.js           # Engine_Selector
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
Input Card 표시 (5개 드롭다운 기본값 없음)
    │
    ▼
사용자가 5개 항목 선택
    │
    ▼
"추천받기" 클릭
    │
    ├─ 버튼 비활성화 + "분석 중..." 표시
    │
    ▼
POST /api/recommend
    │
    ├─ 성공 → Result Card fade-in 표시
    │         추천 행동 / 이유 / 대안 렌더링
    │
    └─ 실패 → Error 메시지 표시
              버튼 재활성화
```

---

## 반응형

- 모바일 (< 480px): 단일 컬럼, 드롭다운 1열
- 태블릿/데스크탑 (≥ 480px): 카드 중앙 정렬, 드롭다운 2열 유지
