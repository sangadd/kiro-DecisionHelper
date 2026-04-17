/**
 * Recommendation_Engine 인터페이스 정의
 * @typedef {{ fatigue: string, time: string, weather: string, budget: string, mood: string }} UserInput
 * @typedef {{ recommendation: string, reason: string, alternatives: string[] }} RecommendationResponse
 * @typedef {(input: UserInput) => Promise<RecommendationResponse>} RecommendationEngine
 */

module.exports = {};
