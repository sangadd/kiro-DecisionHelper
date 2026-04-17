const ruleEngine = require('./engines/ruleEngine');

/**
 * Engine_Selector - 환경변수에 따라 엔진 선택
 * aiEngine은 실제로 필요할 때만 require (지연 로딩)
 * @returns {{ engine: object, name: string }}
 */
function selectEngine() {
  const engineEnv = process.env.RECOMMENDATION_ENGINE;
  const apiKey = process.env.AI_API_KEY;

  if (engineEnv === 'ai') {
    if (!apiKey) {
      console.warn('[Engine_Selector] AI_API_KEY가 설정되지 않아 Rule_Based_Engine으로 전환합니다.');
      return { engine: ruleEngine, name: 'rule' };
    }
    const aiEngine = require('./engines/aiEngine');
    return { engine: aiEngine, name: 'ai' };
  }

  return { engine: ruleEngine, name: 'rule' };
}

module.exports = { selectEngine };
