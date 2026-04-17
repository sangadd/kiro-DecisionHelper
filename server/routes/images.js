const express = require('express');
const router = express.Router();

// GET /api/images?q=cozy+cafe&count=3
router.get('/', async (req, res) => {
  const query = req.query.q || 'lifestyle';
  const count = Math.min(parseInt(req.query.count) || 3, 6);
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return res.status(503).json({ success: false, error: { message: 'Unsplash API 키가 설정되지 않았습니다' } });
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API 오류: ${response.status}`);
    }

    const data = await response.json();
    const images = (data.results || []).map(photo => ({
      id: photo.id,
      url: photo.urls.small,        // 400px 너비, 빠른 로드
      thumb: photo.urls.thumb,      // 200px 썸네일
      alt: photo.alt_description || query,
      credit: photo.user.name,
      credit_link: photo.user.links.html
    }));

    res.json({ success: true, data: images });
  } catch (err) {
    console.error('[images] 오류:', err.message);
    res.status(500).json({ success: false, error: { message: '이미지를 불러오지 못했습니다' } });
  }
});

module.exports = router;
