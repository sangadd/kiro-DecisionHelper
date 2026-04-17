const express = require('express');
const router = express.Router();

// Open-Meteo WMO 날씨 코드 → 앱 weather 값 매핑
// https://open-meteo.com/en/docs#weathervariables
const WMO_TO_WEATHER = {
  0:  'sunny',       // 맑음
  1:  'sunny',       // 주로 맑음
  2:  'cloudy',      // 부분적으로 흐림
  3:  'cloudy',      // 흐림
  45: 'cloudy',      // 안개
  48: 'cloudy',      // 서리 안개
  51: 'rainy_light', // 가랑비 (약)
  53: 'rainy_light', // 가랑비 (중)
  55: 'rainy',       // 가랑비 (강)
  61: 'rainy',       // 비 (약)
  63: 'rainy',       // 비 (중)
  65: 'rainy_heavy', // 비 (강)
  71: 'snowy',       // 눈 (약)
  73: 'snowy',       // 눈 (중)
  75: 'snowy',       // 눈 (강)
  77: 'snowy',       // 싸락눈
  80: 'rainy',       // 소나기 (약)
  81: 'rainy',       // 소나기 (중)
  82: 'rainy_heavy', // 소나기 (강)
  85: 'snowy',       // 눈 소나기
  86: 'snowy',       // 눈 소나기 (강)
  95: 'rainy_heavy', // 뇌우
  96: 'rainy_heavy', // 뇌우 + 우박
  99: 'rainy_heavy', // 뇌우 + 강한 우박
};

/**
 * 기온 + WMO 코드를 조합해 더 정확한 weather 값 결정
 */
function resolveWeather(wmoCode, tempC, windspeedKmh) {
  // 강풍 우선 (30km/h 이상)
  if (windspeedKmh >= 30 && !WMO_TO_WEATHER[wmoCode]?.includes('rainy') && !WMO_TO_WEATHER[wmoCode]?.includes('snowy')) {
    return 'windy';
  }

  const base = WMO_TO_WEATHER[wmoCode] ?? 'cloudy';

  // 맑음인데 30도 이상이면 sunny_hot
  if (base === 'sunny' && tempC >= 30) return 'sunny_hot';
  // 맑음인데 10도 이하면 cold
  if (base === 'sunny' && tempC <= 10) return 'cold';

  return base;
}

// GET /api/weather?lat=37.5&lon=126.9
router.get('/', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      success: false,
      error: { message: '위치 정보(lat, lon)가 필요합니다' }
    });
  }

  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    return res.status(400).json({
      success: false,
      error: { message: '유효하지 않은 좌표값입니다' }
    });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${parsedLat}&longitude=${parsedLon}&current=temperature_2m,weathercode,windspeed_10m&timezone=auto`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`Open-Meteo API 오류: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;

    if (!current) {
      throw new Error('날씨 데이터를 파싱할 수 없습니다');
    }

    const tempC       = current.temperature_2m;
    const wmoCode     = current.weathercode;
    const windspeed   = current.windspeed_10m;
    const weather     = resolveWeather(wmoCode, tempC, windspeed);

    res.json({
      success: true,
      data: {
        weather,          // 앱 드롭다운 값
        temperature: tempC,
        windspeed,
        wmoCode,
      }
    });
  } catch (err) {
    console.error('[weather] 오류:', err.message);
    res.status(500).json({
      success: false,
      error: { message: '날씨 정보를 불러오지 못했습니다' }
    });
  }
});

module.exports = router;
