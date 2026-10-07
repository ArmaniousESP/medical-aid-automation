import type { PickerOption } from '@/components/SearchablePicker';

/** Common Egyptian cities / governorates for intake. */
export const CITY_OPTIONS: PickerOption[] = [
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
].map((c) => ({ value: c, label: c }));

/** Starter company list — staff can still type a new name. */
export const COMPANY_OPTIONS: PickerOption[] = [
  'Armanious Foundation',
  'EVA Pharma',
  'Other / أخرى',
].map((c) => ({ value: c, label: c }));

export const RELATION_OPTIONS: PickerOption[] = [
  { value: 'self', label: 'Self · نفسه' },
  { value: 'spouse', label: 'Spouse · الزوج/الزوجة' },
  { value: 'child', label: 'Child · ابن/ابنة' },
  { value: 'parent', label: 'Parent · والد/والدة' },
  { value: 'sibling', label: 'Sibling · أخ/أخت' },
  { value: 'other', label: 'Other · أخرى' },
];
