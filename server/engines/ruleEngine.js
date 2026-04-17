/**
 * Rule_Based_Engine - 규칙 기반 추천 엔진
 */

const SCENARIOS = [
  {
    match: { fatigue: 'high' },
    recommendation: '집에서 푹 쉬기',
    reason: '피로도가 높은 상태에서는 충분한 휴식이 최우선이에요. 몸이 회복되어야 다음 활동도 즐길 수 있어요.',
    alternatives: ['가벼운 스트레칭', '명상 또는 낮잠'],
    keyword: 'rest relaxation home'
  },
  {
    match: { fatigue: 'high', mood: 'lazy' },
    recommendation: '넷플릭스 보며 쉬기',
    reason: '피로하고 기분도 처진 날엔 좋아하는 콘텐츠로 재충전하는 게 최고예요.',
    alternatives: ['유튜브 보기', '음악 들으며 누워있기'],
    keyword: 'netflix relaxing cozy'
  },
  {
    match: { weather: 'rainy', mood: 'lazy' },
    recommendation: '카페에서 책 읽기',
    reason: '비 오는 날 카페의 빗소리와 함께하는 독서는 특별한 여유를 선사해요.',
    alternatives: ['집에서 독서', '영화 감상'],
    keyword: 'cafe reading rainy day'
  },
  {
    match: { weather: 'sunny', mood: 'energetic', fatigue: 'low' },
    recommendation: '야외 산책 또는 러닝',
    reason: '맑은 날씨에 에너지도 넘치고 피로도도 낮으니 야외 활동이 딱이에요!',
    alternatives: ['자전거 타기', '공원 피크닉'],
    keyword: 'outdoor running sunny park'
  },
  {
    match: { budget: 'low', time: 'long' },
    recommendation: '집에서 새로운 요리 도전',
    reason: '시간은 충분하고 예산이 적을 때는 집에서 요리하며 새로운 레시피를 시도해보세요.',
    alternatives: ['유튜브로 배우기', '집 정리 및 청소'],
    keyword: 'home cooking recipe'
  },
  {
    match: { budget: 'high', mood: 'energetic', time: 'long' },
    recommendation: '새로운 레스토랑 방문',
    reason: '예산도 넉넉하고 기분도 좋으니 평소 가보고 싶었던 맛집을 방문해보세요!',
    alternatives: ['쇼핑 즐기기', '문화 공연 관람'],
    keyword: 'fine dining restaurant food'
  },
  {
    match: { time: 'short', fatigue: 'medium' },
    recommendation: '근처 카페에서 커피 한 잔',
    reason: '짧은 시간에 적당한 피로를 풀기엔 가까운 카페에서의 여유가 딱 맞아요.',
    alternatives: ['편의점 간식 즐기기', '공원 벤치에서 쉬기'],
    keyword: 'coffee cafe break'
  },
  {
    match: { weather: 'snowy', budget: 'low' },
    recommendation: '따뜻한 집에서 핫초코 마시기',
    reason: '눈 오는 날 예산이 적다면 집에서 따뜻한 음료와 함께 창밖 설경을 즐겨보세요.',
    alternatives: ['따뜻한 국물 요리 만들기', '담요 덮고 영화 보기'],
    keyword: 'hot chocolate cozy winter'
  },
  {
    match: { mood: 'normal', time: 'medium', weather: 'cloudy' },
    recommendation: '실내 전시회 또는 박물관 방문',
    reason: '흐린 날씨에 보통 기분이라면 문화생활로 새로운 자극을 받아보는 건 어떨까요?',
    alternatives: ['도서관 방문', '쇼핑몰 구경'],
    keyword: 'museum art exhibition indoor'
  },
  {
    match: { fatigue: 'low', mood: 'energetic', budget: 'medium' },
    recommendation: '친구와 보드게임 카페',
    reason: '에너지 넘치고 피로도 없으니 친구들과 함께 즐거운 시간을 보내보세요!',
    alternatives: ['방탈출 카페', '볼링장 방문'],
    keyword: 'board game friends fun'
  },
  {
    match: { time: 'long', mood: 'normal', fatigue: 'medium' },
    recommendation: '온라인 강의로 새로운 스킬 배우기',
    reason: '시간이 충분하고 적당한 컨디션이라면 자기계발에 투자해보는 건 어떨까요?',
    alternatives: ['독서', '유튜브 튜토리얼 따라하기'],
    keyword: 'online learning study skill'
  },
  {
    match: { weather: 'sunny', budget: 'medium', time: 'medium' },
    recommendation: '근처 공원에서 피크닉',
    reason: '맑은 날씨에 적당한 예산과 시간이 있다면 도시락 싸서 공원 피크닉을 즐겨보세요.',
    alternatives: ['카페 테라스 방문', '한강 산책'],
    keyword: 'picnic park sunny outdoor'
  }
];

/**
 * 입력과 시나리오 매칭 점수 계산
 */
function scoreScenario(input, scenario) {
  const keys = Object.keys(scenario.match);
  let score = 0;
  for (const key of keys) {
    if (input[key] === scenario.match[key]) score++;
    else return -1; // 하나라도 불일치하면 제외
  }
  return score;
}

/**
 * Rule_Based_Engine 추천 함수
 * @param {import('./interface').UserInput} input
 * @returns {Promise<import('./interface').RecommendationResponse>}
 */
async function recommend(input) {
  let bestScenario = null;
  let bestScore = -1;

  for (const scenario of SCENARIOS) {
    const score = scoreScenario(input, scenario);
    if (score > bestScore) {
      bestScore = score;
      bestScenario = scenario;
    }
  }

  // 매칭 없으면 기본 추천
  if (!bestScenario) {
    return {
      recommendation: '잠깐 스트레칭하고 물 한 잔 마시기',
      reason: '어떤 상황에서도 짧은 스트레칭과 수분 보충은 몸과 마음을 리셋해줘요.',
      alternatives: ['5분 명상', '좋아하는 음악 듣기']
    };
  }

  return {
    recommendation: bestScenario.recommendation,
    reason: bestScenario.reason,
    alternatives: bestScenario.alternatives,
    keyword: bestScenario.keyword || bestScenario.recommendation
  };
}

module.exports = { recommend };
