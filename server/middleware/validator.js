const VALID_VALUES = {
  fatigue:       ['very_low', 'low', 'medium', 'high', 'very_high'],
  time:          ['very_short', 'short', 'medium', 'long', 'very_long'],
  weather:       ['sunny_hot', 'sunny', 'cloudy', 'rainy_light', 'rainy', 'rainy_heavy', 'snowy', 'windy', 'cold'],
  budget:        ['none', 'very_low', 'low', 'medium', 'high', 'very_high'],
  mood:          ['very_energetic', 'energetic', 'normal', 'lazy', 'depressed', 'anxious', 'bored'],
  sleep:         ['great', 'good', 'poor', 'very_poor'],
  hunger:        ['full', 'normal', 'hungry', 'very_hungry'],
  stress:        ['none', 'low', 'medium', 'high', 'very_high'],
  companion:     ['alone', 'partner', 'friends', 'family', 'colleague'],
  activity_type: ['rest', 'social', 'creative', 'physical', 'learning', 'entertainment', 'food', 'nature', 'shopping', 'undecided'],
  location_pref: ['home', 'nearby', 'local', 'city', 'outdoor', 'anywhere'],
};

function validateInput(req, res, next) {
  const body = req.body;
  const errors = [];

  // 값이 있는 필드만 유효성 검사 (모든 필드 선택 사항)
  for (const [field, allowed] of Object.entries(VALID_VALUES)) {
    if (body[field] && !allowed.includes(body[field])) {
      errors.push(`'${field}' 값이 올바르지 않습니다. 허용 값: ${allowed.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: { message: '입력값 검증에 실패했습니다', details: errors }
    });
  }

  next();
}

module.exports = { validateInput };
