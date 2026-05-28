import { ReactNode } from 'react';

type Props = {
   title: string;
   value: number | string;
   description?: string;
   icon?: ReactNode;
   tone?: 'default' | 'warning' | 'danger' | 'success';
};

const toneClassMap: Record<NonNullable<Props['tone']>, string> = {
   default: 'bg-white text-ink ring-1 ring-mist/70',
   warning: 'bg-sun/15 text-ink ring-1 ring-sun/30',
   danger: 'bg-ember/15 text-ink ring-1 ring-ember/30',
   success: 'bg-mint/15 text-ink ring-1 ring-mint/30',
};

export function KpiCard({ title, value, description, icon, tone = 'default' }: Props) {
   return (
      <article className={`rounded-2xl p-4 shadow-card ${toneClassMap[tone]}`}>
         <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-steel">{title}</p>
            {icon && <span className="text-steel">{icon}</span>}
         </div>
         <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
         {description && <p className="mt-2 text-xs text-steel">{description}</p>}
      </article>
   );
}
