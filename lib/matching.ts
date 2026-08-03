import { CONFIG } from './config';

export interface MedEntry {
  name: string;
  price: number | string | null;
  eva: string | null;
  norm: string;
}

export function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toUpperCase()
    .replace(/[^\w\s.\-/%\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  let common = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) common++;
  });
  const tokenScore = (2 * common) / (tokensA.size + tokensB.size || 1);

  function bigrams(s: string): string[] {
    const res: string[] = [];
    for (let i = 0; i < s.length - 1; i++) res.push(s.substr(i, 2));
    return res;
  }
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  let inter = 0;
  const bgBcopy = [...bgB];
  bgA.forEach((bg) => {
    const idx = bgBcopy.indexOf(bg);
    if (idx !== -1) {
      inter++;
      bgBcopy.splice(idx, 1);
    }
  });
  const dice = (2 * inter) / (bgA.length + bgB.length || 1);

  return Math.max(tokenScore, dice * 0.85 + tokenScore * 0.15);
}

export function bestMedMatch(
  requested: string,
  medDb: MedEntry[]
): { name: string | null; price: number | string | null; eva: string | null; score: number } {
  if (!requested) return { name: null, price: null, eva: null, score: 0 };

  const reqNorm = normalize(requested);
  let best = { name: null as string | null, price: null as any, eva: null as string | null, score: 0 };

  for (const m of medDb) {
    if (reqNorm === m.norm) {
      return { name: m.name, price: m.price, eva: m.eva, score: 1 };
    }
    const score = similarity(reqNorm, m.norm);
    if (score > best.score) {
      best = { name: m.name, price: m.price, eva: m.eva, score };
    }
  }

  if (best.score >= CONFIG.FUZZY_THRESHOLD) return best;
  return { name: null, price: null, eva: null, score: best.score };
}

/**
 * Parse quantity from free-text medication name.
 */
export function parseQuantity(text: string): { qty: number; cleanName: string } {
  if (!text) return { qty: CONFIG.DEFAULT_QTY, cleanName: '' };

  const original = String(text).trim();
  let qty = CONFIG.DEFAULT_QTY;
  let clean = original;

  // Leading number: "2 CRESTOR", "1.5 AERIUS", "3x Forxiga"
  let m = original.match(/^(\d+(?:[.,]\d+)?)\s*[xX×*]?\s+(.+)$/);
  if (m) {
    qty = parseFloat(m[1].replace(',', '.'));
    clean = m[2].trim();
    return { qty, cleanName: clean };
  }

  // Trailing: "CRESTOR (2)", "Ator × 3"
  m = original.match(/^(.*?)\s*[\[\(]?\s*[xX×*]?\s*(\d+(?:[.,]\d+)?)\s*[\]\)]?\s*$/);
  if (m && m[1].trim().length > 3) {
    qty = parseFloat(m[2].replace(',', '.'));
    clean = m[1].trim();
    return { qty, cleanName: clean };
  }

  // Arabic quantity words
  const arabicMap: { re: RegExp; q: number }[] = [
    { re: /علبتين|علبتان|شريطين|شريطان|إثنين|اثنين|٢/i, q: 2 },
    { re: /ثلاث\s*علب|ثلاثة|٣/i, q: 3 },
    { re: /أربع\s*علب|اربعة|٤/i, q: 4 },
    { re: /خمس\s*علب|خمسة|٥/i, q: 5 },
    { re: /علبة\s*واحدة|واحدة|واحد|١/i, q: 1 },
    { re: /نصف|½/i, q: 0.5 },
    { re: /علبة\s*ونص|واحد\s*ونص|١\.٥/i, q: 1.5 },
    { re: /علبتين\s*ونص|٢\.٥/i, q: 2.5 },
  ];

  for (const item of arabicMap) {
    if (item.re.test(original)) {
      qty = item.q;
      clean = original.replace(item.re, '').replace(/\s+/g, ' ').trim();
      if (clean.length < 3) clean = original;
      return { qty, cleanName: clean };
    }
  }

  // Number + unit: "2 علبة", "علبة 3"
  m = original.match(/(\d+(?:[.,]\d+)?)\s*(علبة|علب|شريط|شرائط|علبات|box|boxes|pack|packs)/i);
  if (m) {
    qty = parseFloat(m[1].replace(',', '.'));
    clean = original.replace(m[0], '').replace(/\s+/g, ' ').trim();
    if (clean.length < 3) clean = original;
    return { qty, cleanName: clean };
  }

  return { qty: CONFIG.DEFAULT_QTY, cleanName: original };
}

export function cleanDriveLinks(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' , ');
}
