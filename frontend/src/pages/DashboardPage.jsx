import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { useTenantAuthContext } from '../hooks/useTenantAuthContext';
import { branchService, userService } from '../services/api';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useTenantAuthContext();
  const [branchCount, setBranchCount] = useState(null);
  const [staffCount, setStaffCount] = useState(null);

  useEffect(() => {
    branchService.list().then((res) => setBranchCount(res.data.length)).catch(() => setBranchCount(null));
    userService.list().then((res) => setStaffCount(res.data.length)).catch(() => setStaffCount(null));
  }, []);

  const cards = [
    { label: t('dashboard.branchesCard'), value: branchCount, icon: Building2, accent: 'bg-blue-50 text-blue-600' },
    { label: t('dashboard.staffCard'), value: staffCount, icon: Users, accent: 'bg-emerald-50 text-emerald-600' },
    {
      label: t('dashboard.roleCard'),
      value: user?.role ? t(`staff.roles.${user.role}`) : '—',
      icon: ShieldCheck,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          {t('dashboard.welcome')}, {user?.fullName}
          <Sparkles size={20} className="text-amber-400" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div key={card.label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}>
              <card.icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide truncate">{card.label}</p>
              <p className="text-slate-900 text-2xl font-bold mt-0.5">{card.value ?? '—'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-8 flex flex-col items-center justify-center gap-3 text-center py-16">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <Sparkles size={22} className="text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm max-w-md">{t('dashboard.placeholder')}</p>
      </div>
    </div>
  );
}
