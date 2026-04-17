const express = require('express');
const router = express.Router();

// 집에서 하는 활동 키워드 → 장소 검색 불필요
const HOME_KEYWORDS = [
  'home', '집', '넷플릭스', 'netflix', '유튜브', 'youtube',
  '독서', '책읽기', '요리', '청소', '정리', '낮잠', '수면',
  '스트레칭', '명상', '음악감상', '게임', '드라마', '애니',
  '그림', '그리기', '글쓰기', '일기', '뜨개질', '만들기',
];

function isHomeActivity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HOME_KEYWORDS.some(k => lower.includes(k));
}

/**
 * 추천 키워드 → 카카오 로컬 API 검색어 변환
 * place_keyword(구체적 음식명/장소명)를 그대로 활용하고,
 * 영어 키워드는 한국어로 매핑
 */
const EN_TO_KO = {
  cafe: '카페', coffee: '카페', bakery: '베이커리', restaurant: '식당',
  food: '음식점', bar: '술집', pub: '술집', park: '공원',
  gym: '헬스장', museum: '박물관', library: '도서관',
  bookstore: '서점', cinema: '영화관', theater: '공연장',
  gallery: '미술관', shopping: '쇼핑몰', market: '시장',
  spa: '스파', beach: '해변', nature: '공원', outdoor: '공원',
  running: '공원', hiking: '등산', cycling: '자전거',
  swimming: '수영장', meditation: '공원',
};

// 추천 문장에서 핵심 장소 키워드를 추출하는 패턴
// "야외 산책 또는 러닝" → "공원", "카페에서 책 읽기" → "카페" 등
const KEYWORD_PATTERNS = [
  // 음식/식당 (구체적인 것 먼저)
  { pattern: /치킨|후라이드|양념치킨/, keyword: '치킨' },
  { pattern: /삼겹살|고기|구이|갈비/, keyword: '삼겹살' },
  { pattern: /카페|커피|아메리카노|라떼/, keyword: '카페' },
  { pattern: /라멘|라면/, keyword: '라멘' },
  { pattern: /초밥|스시|일식/, keyword: '초밥' },
  { pattern: /피자/, keyword: '피자' },
  { pattern: /버거|햄버거/, keyword: '버거' },
  { pattern: /파스타|이탈리안/, keyword: '파스타' },
  { pattern: /국밥|순대|분식|떡볶이/, keyword: '분식' },
  { pattern: /족발|보쌈/, keyword: '족발' },
  { pattern: /냉면|국수|우동|쌀국수/, keyword: '국수' },
  { pattern: /돈까스|돈가스/, keyword: '돈까스' },
  { pattern: /스테이크/, keyword: '스테이크' },
  { pattern: /짜장|짬뽕|중식/, keyword: '중국집' },
  { pattern: /술|맥주|소주|포차|이자카야/, keyword: '술집' },
  { pattern: /베이커리|빵/, keyword: '베이커리' },
  { pattern: /디저트|케이크/, keyword: '디저트카페' },
  { pattern: /식당|맛집|밥|점심|저녁|음식/, keyword: '음식점' },
  // 활동/장소
  { pattern: /헬스|헬스장|운동|피트니스/, keyword: '헬스장' },
  { pattern: /수영|수영장/, keyword: '수영장' },
  { pattern: /등산|산행/, keyword: '등산' },
  { pattern: /자전거/, keyword: '자전거' },
  { pattern: /산책|러닝|달리기|조깅|야외|공원|피크닉/, keyword: '공원' },
  { pattern: /박물관/, keyword: '박물관' },
  { pattern: /미술관|갤러리|전시/, keyword: '미술관' },
  { pattern: /도서관/, keyword: '도서관' },
  { pattern: /서점|책/, keyword: '서점' },
  { pattern: /영화|영화관/, keyword: '영화관' },
  { pattern: /공연|극장/, keyword: '공연장' },
  { pattern: /쇼핑|쇼핑몰/, keyword: '쇼핑몰' },
  { pattern: /마트|시장/, keyword: '마트' },
  { pattern: /스파|마사지|사우나/, keyword: '스파' },
  { pattern: /해변|바다/, keyword: '해변' },
  { pattern: /보드게임|방탈출/, keyword: '보드게임카페' },
];

function buildSearchQuery(keyword, recommendation) {
  const texts = [keyword, recommendation].filter(Boolean);

  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase().trim();

    // 집 활동 체크
    if (lower === 'home' || isHomeActivity(lower)) return null;
  }

  // 1순위: keyword가 한국어 구체적 키워드면 그대로 사용
  if (keyword) {
    const kLower = keyword.toLowerCase().trim();
    if (kLower !== 'home' && /[가-힣]/.test(keyword)) return keyword.trim();
    if (EN_TO_KO[kLower]) return EN_TO_KO[kLower];
  }

  // 2순위: recommendation 문장에서 패턴 매칭으로 핵심 키워드 추출
  if (recommendation) {
    for (const { pattern, keyword: kw } of KEYWORD_PATTERNS) {
      if (pattern.test(recommendation)) return kw;
    }
  }

  // 3순위: keyword 영어 → 한국어 변환 (이미 위에서 처리됐지만 혹시 모를 경우)
  if (keyword) {
    const kLower = keyword.toLowerCase().trim();
    if (EN_TO_KO[kLower]) return EN_TO_KO[kLower];
  }

  return null;
}

/**
 * 카카오 로컬 API — 키워드 검색
 * https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword
 */
async function searchKakaoPlaces(query, lat, lon, radius) {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY가 설정되지 않았습니다');

  const params = new URLSearchParams({
    query,
    x: lon,          // 경도
    y: lat,          // 위도
    radius,          // 반경 (미터)
    size: 8,         // 최대 결과 수
    sort: 'distance', // 거리순
  });

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`카카오 API 오류: ${response.status} — ${body}`);
  }

  const data = await response.json();

  return (data.documents || []).map(place => ({
    id: place.id,
    name: place.place_name,
    lat: parseFloat(place.y),
    lon: parseFloat(place.x),
    type: place.category_group_name || place.category_name?.split(' > ').pop() || '장소',
    address: place.road_address_name || place.address_name || null,
    distance: place.distance ? `${place.distance}m` : null,
    phone: place.phone || null,
    links: {
      kakao: place.place_url,
      naver: `https://map.naver.com/v5/search/${encodeURIComponent(place.place_name)}`,
    },
  }));
}

// GET /api/places?lat=37.5&lon=127.0&keyword=치킨&recommendation=치킨 먹기&radius=2000
router.get('/', async (req, res) => {
  const { lat, lon, keyword, recommendation } = req.query;
  const radius = Math.min(Math.max(parseInt(req.query.radius) || 2000, 500), 5000);

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      error: { message: '위치 정보(lat, lon)가 필요합니다' },
    });
  }

  // API 키 미설정 시 즉시 반환
  if (!process.env.KAKAO_REST_API_KEY) {
    return res.status(503).json({
      success: false,
      error: { message: 'KAKAO_REST_API_KEY가 설정되지 않았습니다' },
    });
  }

  const searchQuery = buildSearchQuery(keyword, recommendation);

  // 집에서 하는 활동
  if (searchQuery === null) {
    return res.json({ success: true, places: [], home: true });
  }

  // 검색어 추출 실패 시 — 장소 없음으로 반환 (엉뚱한 기본값 방지)
  if (!searchQuery) {
    return res.json({ success: true, places: [], query: '' });
  }

  try {
    const places = await searchKakaoPlaces(searchQuery, lat, lon, radius);

    res.json({
      success: true,
      places,
      query: searchQuery,
    });
  } catch (err) {
    console.error('[places] 카카오 API 오류:', err.message);
    res.status(500).json({
      success: false,
      error: { message: '장소 정보를 불러오지 못했습니다' },
    });
  }
});

module.exports = router;
