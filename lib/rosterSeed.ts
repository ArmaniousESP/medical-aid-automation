/** Compressed HR roster seed — auto-loaded when employee_roster is under-populated */
import { ROSTER_R0 } from '@/lib/rosterSeedR0';
import { ROSTER_R1 } from '@/lib/rosterSeedR1';
import { ROSTER_R2 } from '@/lib/rosterSeedR2';

export const ROSTER_COMPANIES = [
  'أخناتون للتجارة و التوزيع',
  'ايفاجرو صناعات',
  'تجميل',
  'فارما - اكتوبر',
  'فارما - العاشر',
  'فارما - الهرم',
  'مؤسسة ارمانيوس',
  'مدرسة ايفا',
] as const;

export const ROSTER_ROWS = [...ROSTER_R0, ...ROSTER_R1, ...ROSTER_R2];

export function expandRosterSeed() {
  return ROSTER_ROWS.map(([ci, emp_name, emp_id, phone]) => ({
    company: ROSTER_COMPANIES[ci] || '',
    emp_name,
    emp_id: emp_id || undefined,
    phone: phone || undefined,
  }));
}
