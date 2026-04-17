require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(express.json());
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { message: '잘못된 JSON 형식입니다' } });
  }
  next(err);
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// API 라우터
app.use('/api', require('./routes/recommend'));
app.use('/api/images', require('./routes/images'));
app.use('/api/places', require('./routes/places'));

// 404 처리
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: { message: '요청한 경로를 찾을 수 없습니다' } });
});

// 루트 → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, error: { message: '서버 내부 오류가 발생했습니다' } });
});

app.listen(PORT, () => {
  console.log(`✦ AI 결정 도우미 서버 실행 중: http://localhost:${PORT}`);
  console.log(`  엔진: ${process.env.RECOMMENDATION_ENGINE || 'rule'}`);
});
