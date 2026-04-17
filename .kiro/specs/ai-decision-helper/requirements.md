# 요구사항 문서: AI 결정 도우미 (AI Decision Helper)

## 소개

사용자가 현재 상태(피로도, 사용 가능 시간, 날씨, 예산, 기분)를 입력하면, 추천 엔진이 가장 적절한 행동 1개를 추천하고 그 이유를 설명하는 MVP 웹서비스이다. 규칙 기반 추천 엔진과 OpenAI 호환 무료 AI API(기본: Groq) 기반 AI 추천 엔진을 모두 지원하며, 두 엔진은 동일한 인터페이스를 구현하여 상호 교체 가능한 구조로 설계한다. 하루 안에 2인 팀(백엔드 1명, 프론트엔드 1명)이 완성할 수 있는 해커톤 스타일의 현실적인 범위로 설계한다.

## 용어 사전

- **Decision_Helper**: 사용자 상태 입력을 받아 행동을 추천하는 웹서비스 전체 시스템
- **Recommendation_Engine**: 사용자 입력 조합에 따라 추천 행동을 결정하는 서비스 모듈의 공통 인터페이스
- **Rule_Based_Engine**: 사전 정의된 규칙에 따라 추천 행동을 결정하는 Recommendation_Engine 구현체
- **AI_Based_Engine**: OpenAI 호환 API(Groq, Together AI 등)를 활용하여 추천 행동을 결정하는 Recommendation_Engine 구현체
- **Engine_Selector**: 환경변수 설정에 따라 Rule_Based_Engine 또는 AI_Based_Engine을 선택하여 반환하는 팩토리 모듈
- **Input_Validator**: API 요청의 입력값을 검증하는 모듈
- **API_Server**: Express 기반 백엔드 서버로, 추천 API와 헬스체크 API를 제공하는 서버
- **Web_Client**: HTML/CSS/JavaScript로 구현된 프론트엔드 인터페이스
- **Fatigue**: 사용자의 피로도 수준 (low, medium, high)
- **Time**: 사용자의 사용 가능 시간 (short: 1시간 이하, medium: 1~3시간, long: 3시간 이상)
- **Weather**: 현재 날씨 상태 (sunny, rainy, cloudy, snowy)
- **Budget**: 사용 가능한 예산 수준 (low, medium, high)
- **Mood**: 사용자의 현재 기분 상태 (lazy, normal, energetic)
- **Recommendation_Response**: 추천 결과를 담은 JSON 응답 객체로, recommendation, reason, alternatives 필드를 포함한다
- **Fallback**: AI_Based_Engine 호출 실패 시 Rule_Based_Engine으로 자동 전환하는 동작

## MVP 범위

### 포함 항목
- 사용자 상태 입력 폼 (5개 항목)
- 규칙 기반 추천 엔진 (최소 10개 시나리오)
- OpenAI 호환 무료 AI API(기본: Groq) 기반 AI 추천 엔진
- 두 엔진 간 전환 가능한 구조 (환경변수로 선택)
- OpenAI API 호출 실패 시 규칙 기반 엔진으로 자동 폴백
- 추천 결과 표시 (추천 행동, 이유, 대안)
- 입력값 검증 및 에러 처리
- 헬스체크 API
- 정적 파일 서빙을 통한 프론트엔드 제공

### 제외 항목
- 로그인/인증
- 데이터베이스
- 배포 인프라
- 사용자 히스토리 저장
- 다국어 지원

## 요구사항

### 요구사항 1: 사용자 상태 입력

**사용자 스토리:** 사용자로서, 나의 현재 상태를 간편하게 입력하고 싶다. 그래서 나에게 맞는 행동 추천을 받을 수 있다.

#### 인수 조건

1. THE Web_Client SHALL 5개의 입력 필드(fatigue, time, weather, budget, mood)를 드롭다운 형태로 표시한다
2. THE Web_Client SHALL fatigue 필드에 low, medium, high 선택지를 제공한다
3. THE Web_Client SHALL time 필드에 short, medium, long 선택지를 제공한다
4. THE Web_Client SHALL weather 필드에 sunny, rainy, cloudy, snowy 선택지를 제공한다
5. THE Web_Client SHALL budget 필드에 low, medium, high 선택지를 제공한다
6. THE Web_Client SHALL mood 필드에 lazy, normal, energetic 선택지를 제공한다
7. THE Web_Client SHALL 모든 입력 필드에 기본 선택값을 설정하지 않아 사용자가 명시적으로 선택하도록 한다
8. WHEN 사용자가 "추천받기" 버튼을 클릭하면, THE Web_Client SHALL 입력값을 POST /api/recommend 엔드포인트로 전송한다

### 요구사항 2: 입력값 검증

**사용자 스토리:** 개발자로서, 잘못된 입력값이 추천 엔진에 도달하지 않도록 하고 싶다. 그래서 시스템이 안정적으로 동작할 수 있다.

#### 인수 조건

1. WHEN POST /api/recommend 요청을 수신하면, THE Input_Validator SHALL 요청 본문에 fatigue, time, weather, budget, mood 5개 필드가 모두 존재하는지 검증한다
2. WHEN fatigue 필드의 값이 low, medium, high 중 하나가 아닌 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
3. WHEN time 필드의 값이 short, medium, long 중 하나가 아닌 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
4. WHEN weather 필드의 값이 sunny, rainy, cloudy, snowy 중 하나가 아닌 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
5. WHEN budget 필드의 값이 low, medium, high 중 하나가 아닌 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
6. WHEN mood 필드의 값이 lazy, normal, energetic 중 하나가 아닌 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
7. WHEN 하나 이상의 검증 오류가 발견되면, THE API_Server SHALL HTTP 400 상태 코드와 함께 모든 검증 오류를 배열로 반환한다
8. WHEN 요청 본문이 유효한 JSON 형식이 아닌 경우, THE API_Server SHALL HTTP 400 상태 코드와 "잘못된 JSON 형식입니다" 메시지를 반환한다

### 요구사항 3: 규칙 기반 추천 엔진

**사용자 스토리:** 사용자로서, 나의 현재 상태에 맞는 실용적인 행동 추천을 받고 싶다. 그래서 무엇을 할지 결정하는 데 도움을 받을 수 있다.

#### 인수 조건

1. WHEN 유효한 입력을 수신하면, THE Rule_Based_Engine SHALL 입력 조합에 기반하여 가장 적절한 행동 1개를 추천한다
2. THE Rule_Based_Engine SHALL 최소 10개 이상의 서로 다른 추천 시나리오 규칙을 포함한다
3. THE Rule_Based_Engine SHALL 각 추천에 대해 입력 상태를 반영한 자연스럽고 사용자 친화적인 이유 문구를 생성한다
4. THE Rule_Based_Engine SHALL 주요 추천과 함께 2개의 대안 행동을 alternatives 배열로 제공한다
5. THE Rule_Based_Engine SHALL Recommendation_Engine 인터페이스를 구현하여 AI_Based_Engine과 동일한 방식으로 호출 가능한 구조를 유지한다

### 요구사항 4: AI API 환경 설정

**사용자 스토리:** 개발자로서, OpenAI 호환 무료 AI API 키와 엔드포인트를 안전하게 관리하고 엔진 선택을 환경변수로 제어하고 싶다. 그래서 코드 변경 없이 배포 환경에 따라 엔진 및 AI 서비스 제공자를 전환할 수 있다.

#### 인수 조건

1. THE Decision_Helper SHALL .env 파일에서 AI_API_KEY 환경변수를 읽어 OpenAI 호환 AI API(Groq, Together AI 등) 인증에 사용한다
2. THE Decision_Helper SHALL .env 파일에서 AI_API_BASE_URL 환경변수를 읽어 AI API 엔드포인트로 사용하며, 설정되지 않은 경우 기본값으로 Groq 엔드포인트(https://api.groq.com/openai/v1)를 사용한다
3. THE Decision_Helper SHALL .env 파일에서 AI_MODEL 환경변수를 읽어 사용할 AI 모델명으로 사용하며, 설정되지 않은 경우 기본값으로 llama3-8b-8192(Groq 무료 모델)를 사용한다
4. THE Decision_Helper SHALL .env 파일에서 RECOMMENDATION_ENGINE 환경변수를 읽어 사용할 엔진을 결정한다
5. WHEN RECOMMENDATION_ENGINE 환경변수의 값이 "ai"인 경우, THE Engine_Selector SHALL AI_Based_Engine을 선택한다
6. WHEN RECOMMENDATION_ENGINE 환경변수가 설정되지 않았거나 "rule" 이외의 값인 경우, THE Engine_Selector SHALL Rule_Based_Engine을 기본값으로 선택한다
7. WHEN RECOMMENDATION_ENGINE 환경변수가 "ai"이지만 AI_API_KEY가 설정되지 않은 경우, THE Engine_Selector SHALL Rule_Based_Engine으로 자동 전환하고 경고 메시지를 콘솔에 출력한다
8. THE Decision_Helper SHALL 환경변수 설정 예시를 담은 .env.example 파일을 제공하며, 해당 파일에는 AI_API_KEY, AI_API_BASE_URL, AI_MODEL, RECOMMENDATION_ENGINE 항목과 설명 주석을 포함한다
9. THE Decision_Helper SHALL .env 파일을 버전 관리에 포함하지 않도록 .gitignore에 등록한다

### 요구사항 5: AI 기반 추천 엔진

**사용자 스토리:** 사용자로서, OpenAI 호환 무료 AI API(기본: Groq의 llama3-8b-8192)가 나의 상태를 분석하여 더 풍부하고 맥락에 맞는 추천을 받고 싶다. 그래서 규칙 기반보다 다양한 추천 결과를 경험할 수 있다.

#### 인수 조건

1. WHEN 유효한 입력을 수신하면, THE AI_Based_Engine SHALL 사용자 상태를 OpenAI 호환 API(기본: Groq의 llama3-8b-8192)에 전달하여 추천 행동 1개, 이유, 대안 2개를 포함한 응답을 요청한다
2. THE AI_Based_Engine SHALL openai npm 패키지를 사용하되, AI_API_BASE_URL 환경변수를 baseURL로 설정하여 Groq 또는 다른 OpenAI 호환 서비스에 연결한다
3. THE AI_Based_Engine SHALL AI_MODEL 환경변수에 지정된 모델명을 사용하며, 설정되지 않은 경우 llama3-8b-8192를 기본값으로 사용한다
4. THE AI_Based_Engine SHALL OpenAI 호환 API 응답을 파싱하여 recommendation, reason, alternatives 필드를 포함한 Recommendation_Response 형식으로 반환한다
5. THE AI_Based_Engine SHALL Recommendation_Engine 인터페이스를 구현하여 Rule_Based_Engine과 동일한 방식으로 호출 가능한 구조를 유지한다
6. WHEN AI API 호출이 실패하면, THE AI_Based_Engine SHALL 오류를 상위 호출자에게 전파하여 Fallback 처리가 가능하도록 한다
7. THE AI_Based_Engine SHALL AI API 요청 시 타임아웃을 10초로 설정한다

### 요구사항 6: AI 엔진 폴백 처리

**사용자 스토리:** 사용자로서, AI API에 문제가 생겨도 서비스가 중단되지 않고 추천을 받고 싶다. 그래서 안정적으로 서비스를 이용할 수 있다.

#### 인수 조건

1. WHEN AI_Based_Engine이 AI API 호출 오류를 반환하면, THE API_Server SHALL Rule_Based_Engine을 사용하여 추천을 재시도한다
2. WHEN Fallback이 발생하면, THE API_Server SHALL 오류 원인과 폴백 발생 사실을 콘솔에 로깅한다
3. WHEN Fallback이 발생하면, THE API_Server SHALL 사용자에게는 정상적인 추천 결과를 반환하며 폴백 발생 여부를 노출하지 않는다
4. WHEN AI API 타임아웃이 발생하면, THE AI_Based_Engine SHALL 타임아웃 오류를 반환하여 Fallback 처리가 트리거되도록 한다

### 요구사항 7: API 응답 형식

**사용자 스토리:** 개발자로서, 일관된 JSON 응답 형식을 받고 싶다. 그래서 프론트엔드에서 예측 가능하게 응답을 처리할 수 있다.

#### 인수 조건

1. WHEN 추천 요청이 성공하면, THE API_Server SHALL HTTP 200 상태 코드와 함께 다음 형식의 JSON을 반환한다: { "success": true, "data": { "recommendation": string, "reason": string, "alternatives": string[] } }
2. WHEN 검증 오류가 발생하면, THE API_Server SHALL HTTP 400 상태 코드와 함께 다음 형식의 JSON을 반환한다: { "success": false, "error": { "message": string, "details": string[] } }
3. WHEN 서버 내부 오류가 발생하면, THE API_Server SHALL HTTP 500 상태 코드와 함께 다음 형식의 JSON을 반환한다: { "success": false, "error": { "message": "서버 내부 오류가 발생했습니다" } }
4. THE API_Server SHALL 모든 응답의 Content-Type 헤더를 application/json으로 설정한다

### 요구사항 8: 헬스체크 API

**사용자 스토리:** 개발자로서, 서버가 정상 동작 중인지 확인하고 싶다. 그래서 서비스 상태를 빠르게 점검할 수 있다.

#### 인수 조건

1. WHEN GET /api/health 요청을 수신하면, THE API_Server SHALL HTTP 200 상태 코드와 함께 { "status": "ok", "engine": string } 형식의 JSON을 반환한다 (engine 필드는 현재 활성화된 엔진 이름을 나타낸다)

### 요구사항 9: 추천 결과 표시

**사용자 스토리:** 사용자로서, 추천 결과를 이해하기 쉬운 형태로 보고 싶다. 그래서 추천을 받아들일지 판단할 수 있다.

#### 인수 조건

1. WHEN API_Server로부터 추천 응답을 수신하면, THE Web_Client SHALL 추천 행동(recommendation)을 강조된 텍스트로 표시한다
2. WHEN API_Server로부터 추천 응답을 수신하면, THE Web_Client SHALL 추천 이유(reason)를 추천 행동 아래에 표시한다
3. WHEN API_Server로부터 추천 응답을 수신하면, THE Web_Client SHALL 대안 행동(alternatives) 목록을 추천 이유 아래에 표시한다
4. WHEN API_Server로부터 오류 응답을 수신하면, THE Web_Client SHALL 오류 메시지를 사용자에게 표시한다
5. WHILE 추천 요청이 진행 중인 동안, THE Web_Client SHALL "추천받기" 버튼을 비활성화하고 로딩 상태를 표시한다

### 요구사항 10: 프론트엔드 서빙

**사용자 스토리:** 사용자로서, 별도 설정 없이 웹브라우저에서 서비스에 접속하고 싶다. 그래서 바로 사용을 시작할 수 있다.

#### 인수 조건

1. THE API_Server SHALL public 디렉토리의 정적 파일(HTML, CSS, JavaScript)을 루트 경로(/)로 서빙한다
2. WHEN 사용자가 브라우저에서 루트 URL에 접속하면, THE API_Server SHALL index.html 파일을 반환한다

### 요구사항 11: 추천 엔진 모듈 분리

**사용자 스토리:** 개발자로서, 추천 로직이 독립된 모듈로 분리되어 있기를 원한다. 그래서 Rule_Based_Engine과 AI_Based_Engine을 코드 변경 없이 교체할 수 있다.

#### 인수 조건

1. THE Recommendation_Engine SHALL 입력 객체를 받아 Recommendation_Response 객체를 반환하는 단일 함수 인터페이스를 정의한다
2. THE Rule_Based_Engine SHALL Recommendation_Engine 인터페이스를 구현하여 동일한 함수 시그니처를 제공한다
3. THE AI_Based_Engine SHALL Recommendation_Engine 인터페이스를 구현하여 동일한 함수 시그니처를 제공한다
4. THE Engine_Selector SHALL Recommendation_Engine 인터페이스를 반환하여 API_Server가 엔진 구현체를 직접 참조하지 않도록 한다
5. THE Rule_Based_Engine SHALL API 라우팅, 입력 검증, HTTP 처리 로직에 대한 의존성을 갖지 않는다
6. THE AI_Based_Engine SHALL API 라우팅, 입력 검증, HTTP 처리 로직에 대한 의존성을 갖지 않는다
7. THE Rule_Based_Engine과 THE AI_Based_Engine SHALL 각각 별도의 파일(모듈)로 분리되어 독립적으로 테스트 가능한 구조를 유지한다

### 요구사항 12: 에러 처리

**사용자 스토리:** 사용자로서, 오류가 발생했을 때 이해할 수 있는 안내를 받고 싶다. 그래서 어떤 문제가 있는지 파악하고 다시 시도할 수 있다.

#### 인수 조건

1. WHEN 예상하지 못한 서버 오류가 발생하면, THE API_Server SHALL 오류 세부 정보를 콘솔에 로깅하고 사용자에게는 일반적인 오류 메시지를 반환한다
2. WHEN 지원하지 않는 HTTP 메서드로 /api/recommend에 요청하면, THE API_Server SHALL HTTP 405 상태 코드를 반환한다
3. WHEN 존재하지 않는 API 경로로 요청하면, THE API_Server SHALL HTTP 404 상태 코드와 함께 "요청한 경로를 찾을 수 없습니다" 메시지를 반환한다
4. WHEN 네트워크 오류로 API 요청이 실패하면, THE Web_Client SHALL "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요" 메시지를 표시한다
