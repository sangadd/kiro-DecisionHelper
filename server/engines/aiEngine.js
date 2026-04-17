const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_BASE_URL || 'https://api.groq.com/openai/v1',
  timeout: 10000
});

const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

const LABELS = {
  fatigue:       { very_low: '매우 낮음(완전 충전)', low: '낮음(상쾌함)', medium: '보통', high: '높음(지침)', very_high: '매우 높음(완전 방전)' },
  time:          { very_short: '30분도 없음', short: '30분~1시간', medium: '1~2시간', long: '2~4시간', very_long: '하루 종일 여유' },
  weather:       { sunny_hot: '맑고 더움(30도+)', sunny: '맑음', cloudy: '흐림', rainy_light: '가랑비', rainy: '비', rainy_heavy: '폭우', snowy: '눈', windy: '강풍', cold: '추움(10도 이하)' },
  budget:        { none: '없음(무료만)', very_low: '1만원 이하', low: '1~3만원', medium: '3~7만원', high: '7~15만원', very_high: '15만원 이상' },
  mood:          { very_energetic: '매우 활기참', energetic: '활기참', normal: '보통', lazy: '게으름', depressed: '우울', anxious: '불안', bored: '지루함' },
  sleep:         { great: '숙면(8시간+)', good: '양호(6~8시간)', poor: '부족(4~6시간)', very_poor: '매우 부족(4시간 미만)' },
  hunger:        { full: '배부름', normal: '보통', hungry: '배고픔', very_hungry: '매우 배고픔' },
  stress:        { none: '없음', low: '낮음', medium: '보통', high: '높음', very_high: '매우 높음' },
  companion:     { alone: '혼자', partner: '연인과', friends: '친구들과', family: '가족과', colleague: '동료와' },
  activity_type: { rest: '휴식', social: '사교', creative: '창작', physical: '운동', learning: '학습', entertainment: '오락', food: '식도락', nature: '자연', shopping: '쇼핑', undecided: '미정(AI 결정)' },
  location_pref: { home: '집 안', nearby: '근처(10분)', local: '동네(30분)', city: '시내', outdoor: '야외', anywhere: '상관없음' },
};

function label(field, value) {
  return LABELS[field]?.[value] || value;
}

function buildContext(input) {
  const lines = [];
  if (input.fatigue)        lines.push(`피로도: ${label('fatigue', input.fatigue)}`);
  if (input.time)           lines.push(`여유 시간: ${label('time', input.time)}`);
  if (input.weather)        lines.push(`날씨: ${label('weather', input.weather)}`);
  if (input.budget)         lines.push(`예산: ${label('budget', input.budget)}`);
  if (input.mood)           lines.push(`기분: ${label('mood', input.mood)}`);
  if (input.sleep)          lines.push(`수면 상태: ${label('sleep', input.sleep)}`);
  if (input.hunger)         lines.push(`식사 여부: ${label('hunger', input.hunger)}`);
  if (input.stress)         lines.push(`스트레스: ${label('stress', input.stress)}`);
  if (input.companion)      lines.push(`동행: ${label('companion', input.companion)}`);
  if (input.activity_type)  lines.push(`원하는 활동 유형: ${label('activity_type', input.activity_type)}`);
  if (input.location_pref)  lines.push(`장소 선호: ${label('location_pref', input.location_pref)}`);
  if (input.extra_note)     lines.push(`사용자 직접 입력: "${input.extra_note}"`);
  if (lines.length === 0)   lines.push('(입력된 정보 없음 — 자유롭게 추천해주세요)');
  return lines.join('\n');
}

async function recommend(input) {
  const context = buildContext(input);

  const hasNote = !!input.extra_note;

  const placeKeywordGuide = `- place_keyword는 지도에서 주변 장소를 검색할 단어. 아래 규칙을 따르세요:
  1. 음식/식당 추천이면 → 구체적인 음식 종류를 한국어로 (예: 치킨, 삼겹살, 카페, 라멘, 피자, 초밥, 버거, 파스타, 국밥, 냉면, 떡볶이, 이자카야 등)
  2. 장소/활동 추천이면 → 아래 목록 중 하나:
     park, outdoor, nature, beach, gym, workout, running, hiking, cycling, swimming,
     museum, library, bookstore, cinema, theater, gallery, shopping, market, spa, meditation
  3. 집에서 하는 활동이면 → "home"
  (카테고리 단어인 "restaurant", "food", "bar" 대신 반드시 구체적인 음식명을 사용하세요)`;

  const prompt = hasNote
    ? `당신은 사용자의 요청을 분석해서 최적의 행동을 추천하는 AI 도우미입니다.

[사용자 요청 — 이것이 핵심입니다. 반드시 이 요청에 직접 답하세요]
"${input.extra_note}"

[참고할 사용자 상태 — 위 요청과 함께 고려하세요]
${context.replace(`사용자 직접 입력: "${input.extra_note}"\n`, '').trim() || '(추가 정보 없음)'}

[지침]
- 사용자 요청에 직접적으로 답하는 추천을 하세요
- 참고 상태(예산, 시간 등)가 있다면 함께 반영하세요
- recommendation은 한국어로 15자 이내의 구체적인 답변
- reason은 반드시 순수한 한국어로만 작성하세요 (한자, 일본어, 중국어 절대 사용 금지)
- keyword는 유튜브 검색용 영어 단어 1~2개
- image_keyword는 추천 장소/음식/활동을 잘 표현하는 영어 이미지 검색어
<<<<<<< HEAD
=======
${placeKeywordGuide}
>>>>>>> 573e15302b1dfc5d0f4cdb34665f89a0e36d927d

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "recommendation": "추천 (15자 이내)",
  "reason": "추천 이유 (2~3문장, 친근한 말투, 사용자 요청 내용 구체적으로 언급)",
  "alternatives": ["대안1", "대안2"],
  "keyword": "유튜브 검색용 영어 키워드",
<<<<<<< HEAD
  "image_keyword": "장소/음식/활동 이미지 검색용 영어 키워드"
=======
  "image_keyword": "장소/음식/활동 이미지 검색용 영어 키워드",
  "place_keyword": "위 규칙에 따른 키워드"
>>>>>>> 573e15302b1dfc5d0f4cdb34665f89a0e36d927d
}`
    : `당신은 사용자의 현재 상태를 분석해서 최적의 행동을 추천하는 AI 도우미입니다.

[사용자 현재 상태 - 모든 항목을 반드시 반영하세요]
${context}

[중요 지침]
- 위 모든 항목을 종합적으로 고려하여 추천하세요
- 예산, 여유 시간, 날씨, 동행 조건에 맞지 않는 추천은 절대 하지 마세요
- 추천 이유에서 입력한 상태들을 구체적으로 언급하세요
- recommendation은 한국어로 15자 이내의 구체적인 행동으로 작성하세요
- reason은 반드시 순수한 한국어로만 작성하세요 (한자, 일본어, 중국어 절대 사용 금지)
- keyword는 유튜브 검색용 영어 단어 1~2개
- image_keyword는 추천 장소/공간을 잘 표현하는 영어 이미지 검색어 (예: "cozy cafe interior", "city park", "gym workout")
<<<<<<< HEAD
=======
${placeKeywordGuide}
>>>>>>> 573e15302b1dfc5d0f4cdb34665f89a0e36d927d

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "recommendation": "추천 행동 (15자 이내)",
  "reason": "추천 이유 (2~3문장, 친근한 말투, 입력한 상태 구체적으로 언급)",
  "alternatives": ["대안1", "대안2"],
  "keyword": "유튜브 검색용 영어 키워드",
<<<<<<< HEAD
  "image_keyword": "장소/공간 이미지 검색용 영어 키워드"
=======
  "image_keyword": "장소/공간 이미지 검색용 영어 키워드",
  "place_keyword": "위 규칙에 따른 키워드"
>>>>>>> 573e15302b1dfc5d0f4cdb34665f89a0e36d927d
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 700
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('AI 응답이 비어있습니다');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.recommendation || !parsed.reason || !Array.isArray(parsed.alternatives)) {
    throw new Error('AI 응답 형식이 올바르지 않습니다');
  }

  return {
    recommendation: parsed.recommendation,
    reason: parsed.reason,
    alternatives: parsed.alternatives.slice(0, 2),
    keyword: parsed.keyword || parsed.recommendation,
    image_keyword: parsed.image_keyword || parsed.keyword || parsed.recommendation
  };
}

module.exports = { recommend };
