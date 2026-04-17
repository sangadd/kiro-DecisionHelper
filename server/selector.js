const ruleEngine = require('./engines/ruleEngine');
const aiEngine = require('./engines/aiEngine');

/**
 * Engine_Selector - 환경변수에 따라 엔진 선택
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
    return { engine: aiEngine, name: 'ai' };
  }

  return { engine: ruleEngine, name: 'rule' };
}

module.exports = { selectEngine };
