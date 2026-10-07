import type { PickerOption } from '@/components/SearchablePicker';

function labels(items: Array<string | [string, string]>): PickerOption[] {
  return items.map((it) =>
    typeof it === 'string'
      ? { value: it, label: it }
      : { value: it[0], label: it[1] }
  );
}

/** Egyptian cities / governorates (EN + AR). */
export const CITY_OPTIONS: PickerOption[] = labels([
  'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Sharqia', 'Dakahlia', 'Beheira',
  'Gharbia', 'Monufia', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia',
  'Suez', 'North Sinai', 'South Sinai', 'Fayoum', 'Beni Suef', 'Minya',
  'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley',
  'Matrouh', '6th of October', 'Sheikh Zayed', 'New Cairo', 'Helwan',
  'Shubra El Kheima', 'Tanta', 'Mansoura', 'Zagazig', 'Mahalla',
  'القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية',
  'البحيرة', 'الغربية', 'المنوفية', 'كفر الشيخ', 'دمياط', 'بورسعيد',
  'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط',
  'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'الوادي الجديد',
  'مطروح', '6 أكتوبر', 'الشيخ زايد', 'القاهرة الجديدة',
]);

export const COMPANY_OPTIONS: PickerOption[] = labels([
  'Armanious Foundation',
  'EVA Pharma',
  'Other / أخرى',
]);

export const RELATION_OPTIONS: PickerOption[] = labels([
  ['self', 'Self · نفسه'],
  ['spouse', 'Spouse · الزوج/الزوجة'],
  ['child', 'Child · ابن/ابنة'],
  ['parent', 'Parent · والد/والدة'],
  ['sibling', 'Sibling · أخ/أخت'],
  ['other', 'Other · أخرى'],
]);

export const STAFF_ROLE_OPTIONS: PickerOption[] = labels([
  ['admin', 'admin — full access'],
  ['operator', 'operator — day-to-day ops'],
  ['viewer', 'viewer — read-only'],
]);

export const INVENTORY_MODE_OPTIONS: PickerOption[] = labels([
  ['receive', 'استلام (+) · Receive'],
  ['adjust', 'تسوية (+/−) · Adjust'],
  ['write_off', 'إهلاك (−) · Write-off'],
]);

export const DOC_TYPE_OPTIONS: PickerOption[] = labels([
  ['roshetta', 'روشتة · Roshetta'],
  ['invoice', 'فاتورة · Invoice'],
  ['id', 'هوية · ID'],
  ['lab', 'تحاليل · Lab'],
  ['other', 'أخرى · Other'],
]);

export const PROGRAM_STATUS_OPTIONS: PickerOption[] = labels([
  ['', 'All statuses'],
  ['active', 'Active'],
  ['suspended', 'Suspended'],
  ['cancelled', 'Cancelled'],
  ['expired', 'Expired'],
]);

export const EVA_BUCKET_OPTIONS: PickerOption[] = labels([
  ['all', 'الكل · All'],
  ['EVA', 'Available in EVA'],
  ['NOT_EVA', 'NOT IN EVA'],
]);

export const PHARMACY_FORMULARY_OPTIONS: PickerOption[] = labels([
  ['all', 'All routes'],
  ['EVA', 'Available at EVA'],
  ['NOT_EVA', 'Not at EVA'],
]);

export const REFILL_STATUS_OPTIONS: PickerOption[] = labels([
  ['', 'All statuses'],
  ['in_review', 'In review'],
  ['approved', 'Approved'],
  ['partially_approved', 'Partially approved'],
  ['dispensing', 'Dispensing'],
  ['dispensed', 'Dispensed'],
  ['rejected', 'Rejected'],
]);
