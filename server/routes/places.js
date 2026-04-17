const express = require('express');
const router = express.Router();

// 추천 키워드 → Overpass OSM 태그 매핑
const KEYWORD_TO_OSM = {
  // 운동/야외
  'running':        '[leisure=track],[leisure=pitch],[highway=path]',
  'workout':        '[leisure=fitness_centre],[leisure=sports_centre]',
  'gym':            '[leisure=fitness_centre]',
  'hiking':         '[leisure=nature_reserve],[highway=path]',
  'cycling':        '[highway=cycleway],[leisure=track]',
  'park':           '[leisure=park],[leisure=garden]',
  'outdoor':        '[leisure=park],[leisure=nature_reserve]',
  'swimming':       '[leisure=swimming_pool],[leisure=water_park]',
  // 카페/음식
  'cafe':           '[amenity=cafe]',
  'coffee':         '[amenity=cafe]',
  'restaurant':     '[amenity=restaurant]',
  'food':           '[amenity=restaurant],[amenity=food_court]',
  'dining':         '[amenity=restaurant]',
  'bar':            '[amenity=bar],[amenity=pub]',
  'bakery':         '[shop=bakery],[amenity=cafe]',
  // 문화/실내
  'museum':         '[tourism=museum]',
  'library':        '[amenity=library]',
  'bookstore':      '[shop=books]',
  'cinema':         '[amenity=cinema]',
  'theater':        '[amenity=theatre]',
  'gallery':        '[tourism=gallery]',
  // 쇼핑
  'shopping':       '[shop=mall],[shop=department_store]',
  'market':         '[amenity=marketplace],[shop=supermarket]',
  // 휴식
  'meditation':     '[amenity=place_of_worship],[leisure=park]',
  'spa':            '[leisure=spa],[amenity=spa]',
  'nature':         '[leisure=nature_reserve],[leisure=park]',
  'beach':          '[natural=beach]',
  // 기본 fallback
  'default':        '[leisure=park]',
};

function getOsmTags(keyword) {
  if (!keyword) return KEYWORD_TO_OSM['default'];
  const lower = keyword.toLowerCase();
  for (const [key, tags] of Object.entries(KEYWORD_TO_OSM)) {
    if (lower.includes(key)) return tags;
  }
  return KEYWORD_TO_OSM['default'];
}

function buildOverpassQuery(lat, lon, radius, osmTags) {
  const tagList = osmTags.split(',').map(t => t.trim());
  const unions = tagList.map(tag => `
    node${tag}(around:${radius},${lat},${lon});
    way${tag}(around:${radius},${lat},${lon});
  `).join('');

  return `[out:json][timeout:10];(${unions});out center 10;`;
}

// GET /api/places?lat=37.5&lon=127.0&keyword=cafe&radius=1500
router.get('/', async (req, res) => {
  const { lat, lon, keyword, radius = 2000 } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ success: false, error: '위치 정보가 필요합니다' });
  }

  const osmTags = getOsmTags(keyword);
  const query = buildOverpassQuery(parseFloat(lat), parseFloat(lon), parseInt(radius), osmTags);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) throw new Error(`Overpass API 오류: ${response.status}`);

    const data = await response.json();

    const places = (data.elements || [])
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

    res.json({ success: true, places, keyword, osmTags });
  } catch (err) {
    console.error('[places] 오류:', err.message);
    res.status(500).json({ success: false, error: '장소 정보를 불러오지 못했습니다' });
  }
});

module.exports = router;
