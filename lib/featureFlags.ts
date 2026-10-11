/**
 * Product feature flags — default OFF until management approves.
 * Set on Vercel as env vars (no redeploy of code required to flip):
 *
 *   ENABLE_WHO_ASSESSMENT=true
 *   ENABLE_AI_ADHERENCE_COACH=true
 *
 * Optional LLM enhancement for the coach (still needs ENABLE_AI_ADHERENCE_COACH):
 *   XAI_API_KEY=...   (or OPENAI_API_KEY)
 *   XAI_MODEL=grok-2-latest
 */

function truthy(v: string | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

/** WHO five-dimension needs assessment on program files */
export function isWhoAssessmentEnabled(): boolean {
  return truthy(process.env.ENABLE_WHO_ASSESSMENT);
}

/** AI / guided adherence coach suggestions */
export function isAiAdherenceCoachEnabled(): boolean {
  return truthy(process.env.ENABLE_AI_ADHERENCE_COACH);
}

/** LLM available for richer coach copy (optional) */
export function isLlmCoachAvailable(): boolean {
  return !!(process.env.XAI_API_KEY || process.env.OPENAI_API_KEY);
}

export function featureFlagsStatus() {
  return {
    who_assessment: {
      enabled: isWhoAssessmentEnabled(),
      env: 'ENABLE_WHO_ASSESSMENT',
      note: 'Off until management sets ENABLE_WHO_ASSESSMENT=true',
    },
    ai_adherence_coach: {
      enabled: isAiAdherenceCoachEnabled(),
      env: 'ENABLE_AI_ADHERENCE_COACH',
      llm: isLlmCoachAvailable(),
      note: 'Off until ENABLE_AI_ADHERENCE_COACH=true; works without LLM (rules engine)',
    },
  };
}
