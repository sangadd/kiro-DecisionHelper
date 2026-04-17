const express = require('express');
const router = express.Router();
const { validateInput } = require('../middleware/validator');
const { selectEngine } = require('../selector');
const ruleEngine = require('../engines/ruleEngine');

const { engine, name: engineName } = selectEngine();

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    engine: engineName,
    model: engineName === 'ai' ? (process.env.AI_MODEL || 'llama3-8b-8192') : null
  });
});

// POST /api/recommend
router.post('/recommend', validateInput, async (req, res) => {
  try {
    const result = await engine.recommend(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    // AI 엔진 실패 시 rule 엔진으로 폴백
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

    // 최후 방어선: 하드코딩된 기본 응답
    const defaultResult = {
      recommendation: '잠깐 스트레칭하고 물 한 잔 마시기',
      reason: '잠시 몸을 움직이고 수분을 보충해보세요. 어떤 상황에서도 도움이 돼요.',
      alternatives: ['5분 명상', '좋아하는 음악 듣기'],
      keyword: 'stretching relaxation',
      image_keyword: 'stretching yoga calm',
      place_keyword: 'home'
    };
    console.warn('[recommend] 기본 응답 반환');
    res.json({ success: true, data: defaultResult });
  }
});

// 지원하지 않는 메서드
router.all('/recommend', (req, res) => {
  res.status(405).json({ success: false, error: { message: '허용되지 않는 HTTP 메서드입니다' } });
});

module.exports = router;
