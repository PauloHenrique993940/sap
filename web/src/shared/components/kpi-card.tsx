type Props = {
   title: string;
   value: number | string;
   tone?: 'default' | 'warning' | 'danger' | 'success';
};

const toneClassMap: Record<NonNullable<Props['tone']>, string> = {
   default: 'bg-white text-ink',
   warning: 'bg-sun/15 text-ink',
   danger: 'bg-ember/15 text-ink',
   success: 'bg-mint/15 text-ink',
};

export function KpiCard({ title, value, tone = 'default' }: Props) {
   return (
      <article className={`rounded-2xl p-4 shadow-card ${toneClassMap[tone]}`}>
         <p className="text-sm text-steel">{title}</p>
         <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      </article>
   );
}
