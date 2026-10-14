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
  'تجميل',
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
