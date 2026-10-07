/** White medical cross + optional title — used by splash and loading screens */
export function BrandMark({
  size = 'md',
  showTitle = true,
  dark = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  /** dark = white cross on transparent (for emerald backgrounds) */
  dark?: boolean;
}) {
  const box =
    size === 'lg' ? 'h-24 w-24' : size === 'sm' ? 'h-12 w-12' : 'h-16 w-16';
  const v =
    size === 'lg' ? 'h-16 w-5' : size === 'sm' ? 'h-8 w-2.5' : 'h-11 w-3.5';
  const h =
    size === 'lg' ? 'h-5 w-16' : size === 'sm' ? 'h-2.5 w-8' : 'h-3.5 w-11';
  const bar = dark ? 'bg-white' : 'bg-emerald-600';

  return (
    <div className="flex flex-col items-center">
      <div className={`relative flex ${box} items-center justify-center`}>
        <span className={`absolute rounded-md ${v} ${bar}`} />
        <span className={`absolute rounded-md ${h} ${bar}`} />
      </div>
      {showTitle && (
        <>
          <p
            className={`mt-4 font-bold tracking-tight ${
              dark ? 'text-white text-xl' : 'text-slate-900 text-lg'
            }`}
          >
            Medical Aid
          </p>
          <p
            className={`mt-1 text-sm ${
              dark ? 'text-emerald-100' : 'text-slate-500'
            }`}
            dir="rtl"
          >
            دعم العلاج الشهري
          </p>
        </>
      )}
    </div>
  );
}
