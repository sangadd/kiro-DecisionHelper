const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const FEEDBACK_FILE = path.join(__dirname, '../../data/feedback.json');

// data 디렉토리 없으면 생성
function ensureDataDir() {
  const dir = path.dirname(FEEDBACK_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readFeedback() {
  ensureDataDir();
  if (!fs.existsSync(FEEDBACK_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeFeedback(data) {
  ensureDataDir();
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * POST /api/feedback
 * Body: {
 *   rating: 'like' | 'dislike',
 *   recommendation: string,
 *   reason: string,
 *   input: object   // 사용자 입력 (선택)
 * }
 */
router.post('/', (req, res) => {
  const { rating, recommendation, reason, input } = req.body;

  if (!rating || !['like', 'dislike'].includes(rating)) {
    return res.status(400).json({
      success: false,
      error: { message: "rating은 'like' 또는 'dislike'여야 합니다" }
    });
  }

  if (!recommendation || typeof recommendation !== 'string') {
    return res.status(400).json({
      success: false,
      error: { message: 'recommendation이 필요합니다' }
    });
  }

  const entry = {
    id: Date.now(),
    rating,
    recommendation: recommendation.slice(0, 100),
    reason: reason ? String(reason).slice(0, 300) : null,
    input: input && typeof input === 'object' ? input : null,
    createdAt: new Date().toISOString(),
  };

  try {
    const list = readFeedback();
    list.push(entry);
    // 최대 1000개 유지 (오래된 것부터 제거)
    if (list.length > 1000) list.splice(0, list.length - 1000);
    writeFeedback(list);

    console.log(`[feedback] ${rating} — "${entry.recommendation}"`);
    res.json({ success: true, data: { id: entry.id } });
  } catch (err) {
    console.error('[feedback] 저장 오류:', err.message);
    res.status(500).json({
      success: false,
      error: { message: '피드백 저장에 실패했습니다' }
    });
  }
});

/**
 * GET /api/feedback/stats
 * 피드백 통계 (추천별 좋아요/싫어요 집계)
 */
router.get('/stats', (req, res) => {
  try {
    const list = readFeedback();
    const stats = {};

    for (const entry of list) {
      const key = entry.recommendation;
      if (!stats[key]) stats[key] = { like: 0, dislike: 0, total: 0 };
      stats[key][entry.rating]++;
      stats[key].total++;
    }

    // total 내림차순 정렬
    const sorted = Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([recommendation, counts]) => ({ recommendation, ...counts }));

    res.json({ success: true, data: { total: list.length, items: sorted } });
  } catch (err) {
    console.error('[feedback] 통계 오류:', err.message);
    res.status(500).json({
      success: false,
      error: { message: '통계를 불러오지 못했습니다' }
    });
  }
});

module.exports = router;
