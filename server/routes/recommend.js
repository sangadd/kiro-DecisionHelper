const express = require('express');
const router = express.Router();
const { validateInput } = require('../middleware/validator');
const { selectEngine } = require('../selector');
const ruleEngine = require('../engines/ruleEngine');

const { engine, name: engineName } = selectEngine();

// GET /api/health
router.get('/health', (req, res) => {
  const data = { status: 'ok', engine: engineName };
  if (engineName === 'ai') {
    data.model = process.env.AI_MODEL || 'llama3-8b-8192';
  }
  res.json(data);
});

// POST /api/recommend
router.post('/recommend', validateInput, async (req, res) => {
  try {
    const result = await engine.recommend(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    // AI 엔진 실패 시 폴백
    if (engineName === 'ai') {
      console.warn('[Fallback] AI 엔진 오류, Rule_Based_Engine으로 전환:', err.message);
      try {
        const fallbackResult = await ruleEngine.recommend(req.body);
        return res.json({ success: true, data: fallbackResult });
      } catch (fallbackErr) {
        console.error('[Fallback] Rule 엔진도 실패:', fallbackErr.message);
      }
    } else {
      console.error('[recommend] 오류:', err.message);
    }
    res.status(500).json({
      success: false,
      error: { message: '서버 내부 오류가 발생했습니다' }
    });
  }
});

// 지원하지 않는 메서드
router.all('/recommend', (req, res) => {
  res.status(405).json({ success: false, error: { message: '허용되지 않는 HTTP 메서드입니다' } });
});

module.exports = router;
