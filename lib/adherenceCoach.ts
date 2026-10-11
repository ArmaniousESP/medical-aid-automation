/**
 * Adherence coach for chronic programs.
 * - Always has a deterministic rules engine (safe, no external call).
 * - Optionally enhances wording via XAI_API_KEY or OPENAI_API_KEY.
 * Not a clinical decision-support system — staff assist only.
 */

import { query } from '@/lib/db';
import { isAiAdherenceCoachEnabled, isLlmCoachAvailable } from '@/lib/featureFlags';
import { PNAT_DIMENSIONS } from '@/lib/pnat';

export type CoachSuggestion = {
  priority: 'high' | 'medium' | 'low';
  dimension?: string;
  title_en: string;
  title_ar: string;
  action_en: string;
  action_ar: string;
};

export type CoachResult = {
  ok: boolean;
  enabled: boolean;
  mode: 'rules' | 'llm+rules' | 'disabled';
  risk_band?: string;
  summary_en: string;
  summary_ar: string;
  suggestions: CoachSuggestion[];
  disclaimer: string;
  error?: string;
};

const DISCLAIMER =
  'Assistive tips for program staff only — not medical advice or a substitute for clinical judgment.';

function bandPriority(band?: string): number {
  if (band === 'critical') return 4;
  if (band === 'high') return 3;
  if (band === 'medium') return 2;
  return 1;
}

function rulesFromAssessment(input: {
  risk_band?: string;
  scores?: Record<string, number>;
  med_count?: number;
  patient_name?: string;
}): CoachSuggestion[] {
  const out: CoachSuggestion[] = [];
  const scores = input.scores || {};

  for (const d of PNAT_DIMENSIONS) {
    const s = Number(scores[d.key] ?? 0);
    if (s < 4) continue;
    const intervention = d.interventions_ar[0] || 'متابعة مخصّصة';
    out.push({
      priority: s >= 5 ? 'high' : 'medium',
      dimension: d.key,
      title_en: `Barrier: ${d.label_en}`,
      title_ar: `حاجز: ${d.label_ar}`,
      action_en: d.interventions_ar[0]
        ? `Focus care-line on: ${d.interventions_ar[0]}`
        : `Address ${d.label_en} barriers this week`,
      action_ar: intervention,
    });
  }

  if ((input.med_count || 0) >= 5) {
    out.push({
      priority: 'medium',
      dimension: 'therapy',
      title_en: 'Complex regimen',
      title_ar: 'جدول دوائي معقّد',
      action_en:
        'Offer a simple written schedule + single monthly pharmacy pickup date',
      action_ar: 'قدّم جدولاً مكتوباً بسيطاً وموعد صرف شهري موحّد',
    });
  }

  if (input.risk_band === 'critical' || input.risk_band === 'high') {
    out.unshift({
      priority: 'high',
      title_en: 'Priority follow-up',
      title_ar: 'متابعة أولوية',
      action_en:
        'Schedule outbound care-line within 48h; confirm next refill window',
      action_ar: 'اتصِل خلال ٤٨ ساعة وتأكد من نافذة الصرف القادمة',
    });
  }

  if (!out.length) {
    out.push({
      priority: 'low',
      title_en: 'Maintain routine',
      title_ar: 'الحفاظ على الانتظام',
      action_en:
        'Send a friendly refill reminder near cycle end; no intensive intervention needed',
      action_ar: 'تذكير لطيف قبل نهاية الدورة — لا حاجة لتدخل مكثّف',
    });
  }

  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.title_en)) return false;
    seen.add(s.title_en);
    return true;
  });
}

async function maybeEnhanceWithLlm(input: {
  suggestions: CoachSuggestion[];
  risk_band?: string;
  patient_name?: string;
  med_names?: string[];
}): Promise<{ text?: string; used: boolean }> {
  if (!isLlmCoachAvailable()) return { used: false };

  const xaiKey = process.env.XAI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const useXai = !!xaiKey;
  const apiKey = xaiKey || openaiKey;
  if (!apiKey) return { used: false };

  const url = useXai
    ? 'https://api.x.ai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model =
    process.env.XAI_MODEL ||
    process.env.OPENAI_MODEL ||
    (useXai ? 'grok-2-latest' : 'gpt-4o-mini');

  const prompt = `You are an adherence coach assistant for a corporate chronic-medicine support program in Egypt.
Write 3 short bilingual bullet tips (English then Arabic) for program staff based on this context.
Risk band: ${input.risk_band || 'unknown'}
Patient (first name only if present): ${input.patient_name?.split(' ')[0] || 'patient'}
Meds: ${(input.med_names || []).slice(0, 8).join(', ') || 'n/a'}
Existing suggestions: ${input.suggestions.map((s) => s.action_en).join('; ')}
Rules: no prescribing, no dose changes, no diagnosis; practical ops tips only (reminders, care-line, education, pharmacy pickup). Max 120 words.`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content:
              'Helpful staff coach for medication adherence support programs. Not a doctor.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) return { used: false };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return { used: false };
    return { text, used: true };
  } catch {
    return { used: false };
  }
}

export async function runAdherenceCoach(programId: string): Promise<CoachResult> {
  if (!isAiAdherenceCoachEnabled()) {
    return {
      ok: true,
      enabled: false,
      mode: 'disabled',
      summary_en: 'AI adherence coach is off until management enables it.',
      summary_ar: 'مدرب الالتزام موقوف حتى موافقة الإدارة.',
      suggestions: [],
      disclaimer: DISCLAIMER,
    };
  }

  let risk_band: string | undefined;
  let scores: Record<string, number> = {};
  let med_count = 0;
  let patient_name = '';
  let med_names: string[] = [];

  try {
    const p = await query<{ patient_name: string }>(
      `SELECT d.full_name AS patient_name
       FROM chronic_programs cp
       JOIN dependents d ON d.id = cp.dependent_id
       WHERE cp.id = $1`,
      [programId]
    );
    patient_name = p.rows[0]?.patient_name || '';

    const meds = await query<{ matched_name: string | null; requested_name: string }>(
      `SELECT matched_name, requested_name FROM chronic_med_lines
       WHERE program_id = $1 AND is_active
       ORDER BY line_code`,
      [programId]
    );
    med_count = meds.rows.length;
    med_names = meds.rows.map((m) => m.matched_name || m.requested_name);

    try {
      const a = await query<{ risk_band: string | null; scores: unknown }>(
        `SELECT risk_band, scores FROM adherence_assessments
         WHERE program_id = $1 ORDER BY assessed_at DESC LIMIT 1`,
        [programId]
      );
      if (a.rows[0]) {
        risk_band = a.rows[0].risk_band || undefined;
        const raw = a.rows[0].scores as Record<string, unknown>;
        if (raw && typeof raw === 'object') {
          for (const k of [
            'social_economic',
            'health_system',
            'condition',
            'therapy',
            'patient',
          ]) {
            if (typeof raw[k] === 'number') scores[k] = raw[k] as number;
          }
        }
      }
    } catch {
      /* no assessment yet */
    }
  } catch (e: unknown) {
    return {
      ok: false,
      enabled: true,
      mode: 'rules',
      summary_en: 'Could not load program context',
      summary_ar: 'تعذّر تحميل بيانات البرنامج',
      suggestions: [],
      disclaimer: DISCLAIMER,
      error: e instanceof Error ? e.message : 'error',
    };
  }

  const suggestions = rulesFromAssessment({
    risk_band,
    scores,
    med_count,
    patient_name,
  });

  const llm = await maybeEnhanceWithLlm({
    suggestions,
    risk_band,
    patient_name,
    med_names,
  });

  if (llm.used && llm.text) {
    suggestions.unshift({
      priority: bandPriority(risk_band) >= 3 ? 'high' : 'medium',
      title_en: 'Coach narrative',
      title_ar: 'ملخص المدرب',
      action_en: llm.text,
      action_ar: llm.text,
    });
  }

  const summary_en = risk_band
    ? `Risk band ${risk_band} · ${suggestions.length} action tip(s)`
    : `No needs assessment on file yet · general tips from ${med_count} active med(s)`;
  const summary_ar = risk_band
    ? `مستوى الخطر ${risk_band} · ${suggestions.length} إرشاد`
    : `لا يوجد تقييم بعد · إرشادات عامة من ${med_count} دواء نشط`;

  return {
    ok: true,
    enabled: true,
    mode: llm.used ? 'llm+rules' : 'rules',
    risk_band,
    summary_en,
    summary_ar,
    suggestions: suggestions.slice(0, 6),
    disclaimer: DISCLAIMER,
  };
}

export function assertCoachEnabled() {
  if (!isAiAdherenceCoachEnabled()) {
    const err = new Error(
      'AI adherence coach disabled — set ENABLE_AI_ADHERENCE_COACH=true after management approval'
    ) as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}
