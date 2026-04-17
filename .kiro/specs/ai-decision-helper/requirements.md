# 요구사항 문서: AI 결정 도우미 (AI Decision Helper)

## 소개

사용자가 현재 상태(피로도, 사용 가능 시간, 날씨, 예산, 기분 등 최대 11개 항목)를 입력하면, 추천 엔진이 가장 적절한 행동 1개를 추천하고 그 이유를 설명하는 웹서비스이다. 규칙 기반 추천 엔진과 OpenAI 호환 무료 AI API(기본: Groq) 기반 AI 추천 엔진을 모두 지원하며, 두 엔진은 동일한 인터페이스를 구현하여 상호 교체 가능한 구조로 설계한다. 추천 결과와 함께 관련 이미지(Unsplash), 유튜브 링크, 주변 장소 지도(OpenStreetMap)를 함께 제공한다.

## 용어 사전

- **Decision_Helper**: 사용자 상태 입력을 받아 행동을 추천하는 웹서비스 전체 시스템
- **Recommendation_Engine**: 사용자 입력 조합에 따라 추천 행동을 결정하는 서비스 모듈의 공통 인터페이스
- **Rule_Based_Engine**: 사전 정의된 규칙에 따라 추천 행동을 결정하는 Recommendation_Engine 구현체
- **AI_Based_Engine**: OpenAI 호환 API(Groq 등)를 활용하여 추천 행동을 결정하는 Recommendation_Engine 구현체
- **Engine_Selector**: 환경변수 설정에 따라 Rule_Based_Engine 또는 AI_Based_Engine을 선택하여 반환하는 팩토리 모듈
- **Input_Validator**: API 요청의 입력값을 검증하는 모듈 (모든 필드 선택 사항, 값이 있는 경우에만 enum 검증)
- **API_Server**: Express 기반 백엔드 서버
- **Web_Client**: HTML/CSS/JavaScript로 구현된 프론트엔드 인터페이스
- **Recommendation_Response**: 추천 결과를 담은 JSON 응답 객체 (recommendation, reason, alternatives, keyword, image_keyword 포함)
- **Fallback**: AI_Based_Engine 호출 실패 시 Rule_Based_Engine으로 자동 전환하는 동작

## 입력 필드 및 허용값

모든 필드는 선택 사항이며, 값이 있는 경우에만 아래 허용값으로 검증한다.

| 필드 | 허용값 |
|------|--------|
| fatigue | very_low, low, medium, high, very_high |
| time | very_short, short, medium, long, very_long |
| weather | sunny_hot, sunny, cloudy, rainy_light, rainy, rainy_heavy, snowy, windy, cold |
| budget | none, very_low, low, medium, high, very_high |
| mood | very_energetic, energetic, normal, lazy, depressed, anxious, bored |
| sleep | great, good, poor, very_poor |
| hunger | full, normal, hungry, very_hungry |
| stress | none, low, medium, high, very_high |
| companion | alone, partner, friends, family, colleague |
| activity_type | rest, social, creative, physical, learning, entertainment, food, nature, shopping, undecided |
| location_pref | home, nearby, local, city, outdoor, anywhere |
| extra_note | 자유 텍스트 (최대 200자, 검증 없음) |

## 요구사항

### 요구사항 1: 사용자 상태 입력

**사용자 스토리:** 사용자로서, 나의 현재 상태를 간편하게 입력하고 싶다. 그래서 나에게 맞는 행동 추천을 받을 수 있다.

#### 인수 조건

1. THE Web_Client SHALL 11개의 입력 필드를 드롭다운 형태로 표시하며, 추가로 자유 텍스트 입력(extra_note)을 제공한다
2. THE Web_Client SHALL 모든 입력 필드에 기본 선택값을 설정하지 않아 사용자가 명시적으로 선택하도록 한다
3. THE Web_Client SHALL extra_note 필드에 최대 200자 제한과 실시간 글자 수 카운터를 표시한다
4. WHEN 사용자가 "AI 분석 시작" 버튼을 클릭하면, THE Web_Client SHALL 드롭다운 필드 중 최소 1개 이상 선택되었는지 확인한다
5. WHEN 아무 드롭다운도 선택되지 않은 경우, THE Web_Client SHALL "최소 한 가지 항목은 선택해주세요" 오류를 표시한다
6. WHEN 유효한 입력이 있으면, THE Web_Client SHALL 선택된 값만 포함하여 POST /api/recommend 엔드포인트로 전송한다

### 요구사항 2: 입력값 검증

**사용자 스토리:** 개발자로서, 잘못된 입력값이 추천 엔진에 도달하지 않도록 하고 싶다.

#### 인수 조건

1. WHEN POST /api/recommend 요청을 수신하면, THE Input_Validator SHALL 값이 존재하는 필드에 대해서만 허용값 검증을 수행한다 (모든 필드 선택 사항)
2. WHEN 필드 값이 허용값 목록에 없는 경우, THE Input_Validator SHALL 해당 필드명과 허용 값 목록을 포함한 검증 오류를 반환한다
3. WHEN 하나 이상의 검증 오류가 발견되면, THE API_Server SHALL HTTP 400과 함께 `{ success: false, error: { message, details: string[] } }` 형식으로 반환한다
4. WHEN 요청 본문이 유효한 JSON 형식이 아닌 경우, THE API_Server SHALL HTTP 400과 "잘못된 JSON 형식입니다" 메시지를 반환한다

### 요구사항 3: 규칙 기반 추천 엔진

**사용자 스토리:** 사용자로서, 나의 현재 상태에 맞는 실용적인 행동 추천을 받고 싶다.

#### 인수 조건

1. WHEN 유효한 입력을 수신하면, THE Rule_Based_Engine SHALL 입력 조합에 기반하여 가장 많이 매칭되는 시나리오를 선택한다 (부분 매칭 허용, 하나라도 불일치하면 해당 시나리오 제외)
2. THE Rule_Based_Engine SHALL 최소 10개 이상의 서로 다른 추천 시나리오 규칙을 포함한다
3. THE Rule_Based_Engine SHALL 각 추천에 대해 recommendation, reason, alternatives, keyword 필드를 반환한다
4. WHEN 매칭되는 시나리오가 없는 경우, THE Rule_Based_Engine SHALL 기본 추천("잠깐 스트레칭하고 물 한 잔 마시기")을 반환한다

### 요구사항 4: AI API 환경 설정

**사용자 스토리:** 개발자로서, AI API 키와 엔드포인트를 환경변수로 관리하고 싶다.

#### 인수 조건

1. THE Decision_Helper SHALL `RECOMMENDATION_ENGINE` 환경변수로 엔진을 선택한다 (`"rule"` 기본값, `"ai"` 선택)
2. WHEN `RECOMMENDATION_ENGINE=ai`이지만 `AI_API_KEY`가 없는 경우, THE Engine_Selector SHALL Rule_Based_Engine으로 자동 전환하고 경고를 콘솔에 출력한다
3. THE Decision_Helper SHALL `AI_API_BASE_URL` 미설정 시 `https://api.groq.com/openai/v1`을 기본값으로 사용한다
4. THE Decision_Helper SHALL `AI_MODEL` 미설정 시 `llama3-8b-8192`를 기본값으로 사용한다
5. THE Decision_Helper SHALL `.env.example` 파일에 모든 환경변수 예시와 주석을 제공한다

### 요구사항 5: AI 기반 추천 엔진

**사용자 스토리:** 사용자로서, AI가 나의 상태를 분석하여 더 풍부하고 맥락에 맞는 추천을 받고 싶다.

#### 인수 조건

1. WHEN `extra_note`가 있는 경우, THE AI_Based_Engine SHALL extra_note를 핵심 질문으로 삼고 나머지 상태를 보조 맥락으로 사용하는 프롬프트를 구성한다
2. WHEN `extra_note`가 없는 경우, THE AI_Based_Engine SHALL 모든 입력 상태를 종합하여 추천하는 프롬프트를 구성한다
3. THE AI_Based_Engine SHALL AI 응답을 JSON으로 파싱하여 recommendation, reason, alternatives, keyword, image_keyword 필드를 반환한다
4. THE AI_Based_Engine SHALL API 요청 타임아웃을 10초로 설정한다
5. WHEN AI API 호출이 실패하면, THE AI_Based_Engine SHALL 오류를 상위 호출자에게 전파하여 Fallback 처리가 가능하도록 한다

### 요구사항 6: AI 엔진 폴백 처리

**사용자 스토리:** 사용자로서, AI API에 문제가 생겨도 서비스가 중단되지 않고 추천을 받고 싶다.

#### 인수 조건

1. WHEN AI_Based_Engine이 오류를 반환하면, THE API_Server SHALL Rule_Based_Engine으로 재시도한다
2. WHEN Fallback이 발생하면, THE API_Server SHALL 오류 원인을 콘솔에 로깅하고 사용자에게는 정상 추천 결과를 반환한다

### 요구사항 7: API 응답 형식

**사용자 스토리:** 개발자로서, 일관된 JSON 응답 형식을 받고 싶다.

#### 인수 조건

1. WHEN 추천 요청이 성공하면, THE API_Server SHALL `{ success: true, data: { recommendation, reason, alternatives, keyword, image_keyword } }` 형식으로 반환한다
2. WHEN 오류가 발생하면, THE API_Server SHALL `{ success: false, error: { message, details? } }` 형식으로 반환한다
3. WHEN GET /api/health 요청을 수신하면, THE API_Server SHALL `{ status: "ok", engine: string }` 형식으로 반환한다

### 요구사항 8: 추천 결과 표시

**사용자 스토리:** 사용자로서, 추천 결과를 이해하기 쉬운 형태로 보고 싶다.

#### 인수 조건

1. WHEN 추천 응답을 수신하면, THE Web_Client SHALL recommendation, reason, alternatives를 표시한다
2. WHEN 추천 응답을 수신하면, THE Web_Client SHALL keyword를 이용해 유튜브 검색 링크를 생성하여 표시한다
3. WHEN 추천 응답을 수신하면, THE Web_Client SHALL image_keyword로 `/api/images`를 호출하여 관련 이미지 3장을 표시한다
4. WHEN 추천 응답을 수신하면, THE Web_Client SHALL 사용자 위치를 기반으로 `/api/places`를 호출하여 주변 장소를 Leaflet 지도에 표시한다
5. WHILE 추천 요청이 진행 중인 동안, THE Web_Client SHALL 버튼을 비활성화하고 로딩 상태를 표시한다

### 요구사항 9: 이미지 API

**사용자 스토리:** 사용자로서, 추천 결과와 관련된 이미지를 보고 싶다.

#### 인수 조건

1. WHEN GET /api/images?q=keyword&count=N 요청을 수신하면, THE API_Server SHALL Unsplash API를 호출하여 이미지 목록을 반환한다
2. WHEN `UNSPLASH_ACCESS_KEY`가 설정되지 않은 경우, THE API_Server SHALL HTTP 503을 반환한다
3. THE API_Server SHALL 이미지 응답에 id, url, thumb, alt, credit, credit_link 필드를 포함한다

### 요구사항 10: 주변 장소 API

**사용자 스토리:** 사용자로서, 추천 활동을 할 수 있는 주변 장소를 지도에서 보고 싶다.

#### 인수 조건

1. WHEN GET /api/places?lat=&lon=&keyword=&radius= 요청을 수신하면, THE API_Server SHALL Overpass API(OpenStreetMap)를 호출하여 주변 장소를 반환한다
2. THE API_Server SHALL keyword를 OSM 태그로 매핑하여 적절한 장소 유형을 검색한다
3. THE API_Server SHALL 최대 8개의 장소를 반환하며, 각 장소에 id, name, lat, lon, type, address 필드를 포함한다
4. WHEN lat 또는 lon이 없는 경우, THE API_Server SHALL HTTP 400을 반환한다

### 요구사항 11: 에러 처리

**사용자 스토리:** 사용자로서, 오류가 발생했을 때 이해할 수 있는 안내를 받고 싶다.

#### 인수 조건

1. WHEN 예상하지 못한 서버 오류가 발생하면, THE API_Server SHALL 오류를 콘솔에 로깅하고 HTTP 500을 반환한다
2. WHEN 지원하지 않는 HTTP 메서드로 /api/recommend에 요청하면, THE API_Server SHALL HTTP 405를 반환한다
3. WHEN 존재하지 않는 API 경로로 요청하면, THE API_Server SHALL HTTP 404와 "요청한 경로를 찾을 수 없습니다" 메시지를 반환한다
4. WHEN 네트워크 오류로 API 요청이 실패하면, THE Web_Client SHALL "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요" 메시지를 표시한다
