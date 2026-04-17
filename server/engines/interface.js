/**
 * Recommendation_Engine 인터페이스 정의
 * @typedef {{
 *   fatigue?: string,
 *   time?: string,
 *   weather?: string,
 *   budget?: string,
 *   mood?: string,
 *   sleep?: string,
 *   hunger?: string,
 *   stress?: string,
 *   companion?: string,
 *   activity_type?: string,
 *   location_pref?: string,
 *   extra_note?: string
 * }} UserInput
 * @typedef {{
 *   recommendation: string,
 *   reason: string,
 *   alternatives: string[],
 *   keyword?: string,
 *   image_keyword?: string,
 *   place_keyword?: string
 * }} RecommendationResponse
 * @typedef {(input: UserInput) => Promise<RecommendationResponse>} RecommendationEngine
 */

module.exports = {};
