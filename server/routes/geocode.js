const express = require('express');
const router = express.Router();

/**
 * GET /api/geocode?q=강남구
 * 카카오 주소 검색 API로 지역명 → 좌표 변환
 */
router.get('/', async (req, res) => {
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: '검색어(q)가 필요합니다' },
    });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      error: { message: 'KAKAO_REST_API_KEY가 설정되지 않았습니다' },
    });
  }

  try {
    const params = new URLSearchParams({ query: q.trim(), size: 1 });
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?${params}`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) throw new Error(`카카오 API 오류: ${response.status}`);

    const data = await response.json();
    const doc = data.documents?.[0];

    if (doc) {
      return res.json({
        success: true,
        data: {
          lat: parseFloat(doc.y),
          lon: parseFloat(doc.x),
          name: doc.address_name,
        },
      });
    }

    // 주소 검색 실패 시 키워드 검색으로 재시도
    const kwParams = new URLSearchParams({ query: q.trim(), size: 1 });
    const kwResponse = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${kwParams}`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!kwResponse.ok) throw new Error(`카카오 키워드 API 오류: ${kwResponse.status}`);

    const kwData = await kwResponse.json();
    const kwDoc = kwData.documents?.[0];

    if (kwDoc) {
      return res.json({
        success: true,
        data: {
          lat: parseFloat(kwDoc.y),
          lon: parseFloat(kwDoc.x),
          name: kwDoc.place_name || kwDoc.address_name,
        },
      });
    }

    res.json({ success: false, error: { message: '해당 지역을 찾을 수 없습니다' } });
  } catch (err) {
    console.error('[geocode] 오류:', err.message);
    res.status(500).json({
      success: false,
      error: { message: '지역 검색에 실패했습니다' },
    });
  }
});

module.exports = router;
