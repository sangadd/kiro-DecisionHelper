const express = require('express');
const router = express.Router();

// 추천 키워드 → Overpass OSM 태그 매핑
const KEYWORD_TO_OSM = {
  // 카페/음료
  'cafe':           '[amenity=cafe]',
  'coffee':         '[amenity=cafe]',
  'bakery':         '[shop=bakery],[amenity=cafe]',
  'dessert':        '[amenity=cafe],[shop=confectionery]',
  'chocolate':      '[amenity=cafe],[shop=confectionery]',
  'tea':            '[amenity=cafe]',
  'juice':          '[amenity=cafe],[amenity=fast_food]',
  '카페':           '[amenity=cafe]',
  '커피':           '[amenity=cafe]',
  '디저트':         '[amenity=cafe],[shop=confectionery]',
  '빵':             '[shop=bakery],[amenity=cafe]',
  '베이커리':       '[shop=bakery],[amenity=cafe]',
  '차':             '[amenity=cafe]',
  // 음식/식당 — 일반
  'restaurant':     '[amenity=restaurant]',
  'food':           '[amenity=restaurant],[amenity=cafe]',
  'dining':         '[amenity=restaurant]',
  'lunch':          '[amenity=restaurant],[amenity=fast_food]',
  'dinner':         '[amenity=restaurant]',
  'breakfast':      '[amenity=cafe],[amenity=restaurant]',
  'ramen':          '[amenity=restaurant]',
  'sushi':          '[amenity=restaurant]',
  'pizza':          '[amenity=restaurant],[amenity=fast_food]',
  'burger':         '[amenity=fast_food],[amenity=restaurant]',
  'chicken':        '[amenity=fast_food],[amenity=restaurant]',
  'fried chicken':  '[amenity=fast_food],[amenity=restaurant]',
  'bar':            '[amenity=bar],[amenity=pub]',
  'pub':            '[amenity=pub],[amenity=bar]',
  '식당':           '[amenity=restaurant]',
  '맛집':           '[amenity=restaurant]',
  '음식':           '[amenity=restaurant],[amenity=cafe]',
  '밥':             '[amenity=restaurant]',
  '점심':           '[amenity=restaurant],[amenity=fast_food]',
  '저녁':           '[amenity=restaurant]',
  '라멘':           '[amenity=restaurant]',
  '라면':           '[amenity=restaurant]',
  '초밥':           '[amenity=restaurant]',
  '피자':           '[amenity=restaurant],[amenity=fast_food]',
  '버거':           '[amenity=fast_food],[amenity=restaurant]',
  '치킨':           '[amenity=fast_food],[amenity=restaurant]',
  '삼겹살':         '[amenity=restaurant]',
  '고기':           '[amenity=restaurant]',
  '구이':           '[amenity=restaurant]',
  '갈비':           '[amenity=restaurant]',
  '삼계탕':         '[amenity=restaurant]',
  '국밥':           '[amenity=restaurant]',
  '순대':           '[amenity=restaurant]',
  '떡볶이':         '[amenity=fast_food],[amenity=restaurant]',
  '분식':           '[amenity=fast_food],[amenity=restaurant]',
  '족발':           '[amenity=restaurant]',
  '보쌈':           '[amenity=restaurant]',
  '냉면':           '[amenity=restaurant]',
  '국수':           '[amenity=restaurant]',
  '우동':           '[amenity=restaurant]',
  '돈까스':         '[amenity=restaurant]',
  '스테이크':       '[amenity=restaurant]',
  '파스타':         '[amenity=restaurant]',
  '이탈리안':       '[amenity=restaurant]',
  '중식':           '[amenity=restaurant]',
  '짜장면':         '[amenity=restaurant]',
  '짬뽕':           '[amenity=restaurant]',
  '일식':           '[amenity=restaurant]',
  '한식':           '[amenity=restaurant]',
  '양식':           '[amenity=restaurant]',
  '태국':           '[amenity=restaurant]',
  '베트남':         '[amenity=restaurant]',
  '쌀국수':         '[amenity=restaurant]',
  '술':             '[amenity=bar],[amenity=pub]',
  '맥주':           '[amenity=bar],[amenity=pub]',
  '소주':           '[amenity=bar],[amenity=pub]',
  '포차':           '[amenity=bar],[amenity=pub]',
  '이자카야':       '[amenity=bar],[amenity=restaurant]',
  // 운동/야외
  'running':        '[leisure=track],[leisure=pitch],[highway=path]',
  'workout':        '[leisure=fitness_centre],[leisure=sports_centre]',
  'gym':            '[leisure=fitness_centre]',
  'fitness':        '[leisure=fitness_centre],[leisure=sports_centre]',
  'hiking':         '[leisure=nature_reserve],[highway=path]',
  'cycling':        '[highway=cycleway],[leisure=track]',
  'swimming':       '[leisure=swimming_pool],[leisure=water_park]',
  'yoga':           '[leisure=fitness_centre],[leisure=sports_centre]',
  'sports':         '[leisure=sports_centre],[leisure=pitch]',
  '헬스':           '[leisure=fitness_centre]',
  '헬스장':         '[leisure=fitness_centre]',
  '운동':           '[leisure=fitness_centre],[leisure=sports_centre]',
  '러닝':           '[leisure=track],[leisure=pitch],[highway=path]',
  '달리기':         '[leisure=track],[highway=path]',
  '조깅':           '[leisure=track],[highway=path]',
  '자전거':         '[highway=cycleway],[leisure=track]',
  '수영':           '[leisure=swimming_pool]',
  '수영장':         '[leisure=swimming_pool]',
  '요가':           '[leisure=fitness_centre],[leisure=sports_centre]',
  '등산':           '[leisure=nature_reserve],[highway=path]',
  '산책':           '[leisure=park],[highway=footway]',
  '걷기':           '[leisure=park],[highway=footway]',
  // 공원/자연
  'park':           '[leisure=park],[leisure=garden]',
  'outdoor':        '[leisure=park],[leisure=nature_reserve]',
  'nature':         '[leisure=nature_reserve],[leisure=park]',
  'beach':          '[natural=beach]',
  'garden':         '[leisure=garden],[leisure=park]',
  'forest':         '[leisure=nature_reserve],[landuse=forest]',
  'walk':           '[leisure=park],[highway=footway]',
  'stroll':         '[leisure=park],[leisure=garden]',
  '공원':           '[leisure=park],[leisure=garden]',
  '야외':           '[leisure=park],[leisure=nature_reserve]',
  '자연':           '[leisure=nature_reserve],[leisure=park]',
  '해변':           '[natural=beach]',
  '바다':           '[natural=beach]',
  '숲':             '[leisure=nature_reserve],[landuse=forest]',
  '피크닉':         '[leisure=park],[leisure=garden]',
  // 문화/실내
  'museum':         '[tourism=museum]',
  'library':        '[amenity=library]',
  'bookstore':      '[shop=books]',
  'book':           '[shop=books],[amenity=library]',
  'cinema':         '[amenity=cinema]',
  'movie':          '[amenity=cinema]',
  'theater':        '[amenity=theatre]',
  'gallery':        '[tourism=gallery]',
  'art':            '[tourism=gallery],[tourism=museum]',
  'exhibition':     '[tourism=museum],[tourism=gallery]',
  '박물관':         '[tourism=museum]',
  '도서관':         '[amenity=library]',
  '서점':           '[shop=books]',
  '책':             '[shop=books],[amenity=library]',
  '영화':           '[amenity=cinema]',
  '영화관':         '[amenity=cinema]',
  '극장':           '[amenity=theatre]',
  '전시':           '[tourism=museum],[tourism=gallery]',
  '전시회':         '[tourism=museum],[tourism=gallery]',
  '미술관':         '[tourism=gallery]',
  '공연':           '[amenity=theatre]',
  // 쇼핑
  'shopping':       '[shop=mall],[shop=department_store]',
  'market':         '[amenity=marketplace],[shop=supermarket]',
  'mall':           '[shop=mall],[shop=department_store]',
  'store':          '[shop=mall],[shop=department_store]',
  '쇼핑':           '[shop=mall],[shop=department_store]',
  '쇼핑몰':         '[shop=mall],[shop=department_store]',
  '마트':           '[shop=supermarket]',
  '시장':           '[amenity=marketplace]',
  // 휴식/웰니스
  'meditation':     '[amenity=place_of_worship],[leisure=park]',
  'spa':            '[leisure=spa],[amenity=spa]',
  'sauna':          '[leisure=sauna],[leisure=spa]',
  'massage':        '[leisure=spa],[amenity=spa]',
  'relax':          '[leisure=park],[amenity=cafe]',
  'rest':           '[leisure=park],[amenity=cafe]',
  '명상':           '[amenity=place_of_worship],[leisure=park]',
  '스파':           '[leisure=spa],[amenity=spa]',
  '사우나':         '[leisure=sauna],[leisure=spa]',
  '마사지':         '[leisure=spa],[amenity=spa]',
  '휴식':           '[leisure=park],[amenity=cafe]',
  // 기본 fallback
  'default':        '[leisure=park]',
};

// 구체적 음식 키워드 → OSM name 필터 검색용 (정규식 매칭)
// [amenity=restaurant|fast_food][name~"키워드",i] 방식으로 상호명 직접 검색
const FOOD_NAME_KEYWORDS = [
  '치킨', '삼겹살', '갈비', '족발', '보쌈', '냉면', '국밥', '순대', '떡볶이',
  '분식', '돈까스', '스테이크', '파스타', '피자', '버거', '라면', '라멘',
  '초밥', '우동', '국수', '쌀국수', '짜장면', '짬뽕', '탕수육',
  'chicken', 'pizza', 'burger', 'ramen', 'sushi', 'pasta', 'steak',
];

// 집에서 하는 활동 키워드
const HOME_KEYWORDS = [
  'home', '집', '넷플릭스', 'netflix', '유튜브', 'youtube',
  '독서', '책읽기', '요리', '청소', '정리', '낮잠', '수면',
  '스트레칭', '명상', '음악감상', '게임', '드라마', '애니',
  '그림', '그리기', '글쓰기', '일기', '뜨개질', '만들기'
];

function isHomeActivity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HOME_KEYWORDS.some(k => lower.includes(k));
}

/**
 * 텍스트에서 구체적 음식 키워드를 추출
 * @returns {string|null} 매칭된 키워드 또는 null
 */
function extractFoodKeyword(texts) {
  for (const text of texts.filter(Boolean)) {
    const lower = text.toLowerCase();
    for (const kw of FOOD_NAME_KEYWORDS) {
      if (lower.includes(kw.toLowerCase())) return kw;
    }
  }
  return null;
}

function getOsmTags(keyword, recommendation, reason) {
  const primaryTexts = [keyword, recommendation].filter(Boolean);

  // 집 활동 체크
  for (const text of primaryTexts) {
    const lower = text.toLowerCase().trim();
    if (lower === 'home' || isHomeActivity(lower)) return null;
  }

  // 1단계: 구체적 음식 키워드 → name 필터 검색 (가장 정확)
  const foodKw = extractFoodKeyword([keyword, recommendation, reason]);
  if (foodKw) {
    return { nameFilter: foodKw, baseTags: '[amenity=restaurant],[amenity=fast_food]' };
  }

  // 2단계: place_keyword, recommendation — 정확한 키 매칭
  for (const text of primaryTexts) {
    const lower = text.toLowerCase().trim();

    if (KEYWORD_TO_OSM[lower]) return KEYWORD_TO_OSM[lower];

    const words = lower.split(/[\s,_\-\/]+/);
    for (const word of words) {
      if (word.length >= 2 && KEYWORD_TO_OSM[word]) return KEYWORD_TO_OSM[word];
    }

    const sortedKeys = Object.keys(KEYWORD_TO_OSM)
      .filter(k => k !== 'default')
      .sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (lower.includes(key)) return KEYWORD_TO_OSM[key];
    }
  }

  // 3단계: reason — OSM 태그 매칭만 (집 활동 판단 제외)
  if (reason) {
    const lower = reason.toLowerCase();
    const sortedKeys = Object.keys(KEYWORD_TO_OSM)
      .filter(k => k !== 'default')
      .sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (lower.includes(key)) return KEYWORD_TO_OSM[key];
    }
  }

  return KEYWORD_TO_OSM['default'];
}

/**
 * osmTags가 nameFilter 객체인 경우 name 필터 쿼리 생성,
 * 문자열인 경우 기존 방식으로 생성
 */
function buildOverpassQuery(lat, lon, radius, osmTags) {
  // name 필터 방식 (구체적 음식 키워드)
  if (typeof osmTags === 'object' && osmTags.nameFilter) {
    const { nameFilter, baseTags } = osmTags;
    const tagList = baseTags.split(',').map(t => t.trim());
    // name에 키워드가 포함된 식당/패스트푸드 검색
    const unions = tagList.map(tag => `
      node${tag}["name"~"${nameFilter}",i](around:${radius},${lat},${lon});
      way${tag}["name"~"${nameFilter}",i](around:${radius},${lat},${lon});
    `).join('');
    return `[out:json][timeout:10];(${unions});out center 10;`;
  }

  // 기존 카테고리 방식
  const tagList = osmTags.split(',').map(t => t.trim());
  const unions = tagList.map(tag => `
    node${tag}(around:${radius},${lat},${lon});
    way${tag}(around:${radius},${lat},${lon});
  `).join('');
  return `[out:json][timeout:10];(${unions});out center 10;`;
}

// GET /api/places?lat=37.5&lon=127.0&keyword=치킨&recommendation=치킨 먹기&reason=...&radius=2000
router.get('/', async (req, res) => {
  const { lat, lon, keyword, recommendation, reason, radius = 2000 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ success: false, error: { message: '위치 정보가 필요합니다' } });
  }

  const osmTags = getOsmTags(keyword, recommendation, reason);

  console.log('[places] 입력:', { keyword, recommendation: recommendation?.slice(0, 30), reason: reason?.slice(0, 40) });
  console.log('[places] osmTags 결과:', JSON.stringify(osmTags));

  // 집에서 하는 활동은 주변 장소 검색 불필요
  if (osmTags === null) {
    return res.json({ success: true, places: [], keyword, home: true });
  }

  try {
    let places = await fetchPlaces(lat, lon, radius, osmTags);

    // name 필터 검색 결과가 없으면 카테고리 검색으로 폴백
    if (places.length === 0 && typeof osmTags === 'object' && osmTags.nameFilter) {
      console.log(`[places] name 필터 결과 없음, 카테고리 폴백: ${osmTags.baseTags}`);
      places = await fetchPlaces(lat, lon, radius, osmTags.baseTags);
    }

    res.json({ success: true, places, keyword, osmTags: typeof osmTags === 'string' ? osmTags : osmTags.baseTags });
  } catch (err) {
    console.error('[places] 오류:', err.message);
    res.status(500).json({ success: false, error: { message: '장소 정보를 불러오지 못했습니다' } });
  }
});

async function fetchPlaces(lat, lon, radius, osmTags) {
  const query = buildOverpassQuery(parseFloat(lat), parseFloat(lon), parseInt(radius), osmTags);

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) throw new Error(`Overpass API 오류: ${response.status}`);

  const data = await response.json();

  return (data.elements || [])
    .filter(el => el.tags?.name)
    .slice(0, 8)
    .map(el => {
      const placeLat = el.lat ?? el.center?.lat;
      const placeLon = el.lon ?? el.center?.lon;
      return {
        id: el.id,
        name: el.tags.name,
        lat: placeLat,
        lon: placeLon,
        type: el.tags.amenity || el.tags.leisure || el.tags.shop || el.tags.tourism || 'place',
        address: [el.tags['addr:street'], el.tags['addr:housenumber']].filter(Boolean).join(' ') || null,
      };
    })
    .filter(p => p.lat && p.lon);
}

module.exports = router;
