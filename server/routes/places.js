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

function buildSearchQuery(keyword, recommendation) {
  const texts = [keyword, recommendation].filter(Boolean);

  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase().trim();

    // 집 활동 체크
    if (lower === 'home' || isHomeActivity(lower)) return null;

    // 영어 키워드 → 한국어 변환
    if (EN_TO_KO[lower]) return EN_TO_KO[lower];

    // 한국어 키워드는 그대로 사용 (치킨, 삼겹살, 카페 등)
    if (/[가-힣]/.test(text)) return text.trim();
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

  // 검색어를 추출하지 못한 경우 기본값
  const finalQuery = searchQuery || '카페';

  try {
    const places = await searchKakaoPlaces(finalQuery, lat, lon, radius);

    res.json({
      success: true,
      places,
      query: finalQuery,
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
