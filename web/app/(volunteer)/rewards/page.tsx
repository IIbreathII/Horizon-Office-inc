import { BalancePill } from '@/features/rewards/BalancePill';
import { RewardShop } from '@/features/rewards/RewardShop';
import { PageShell } from '@/shared/ui/PageShell';

export default function RewardsPage() {
  return (
    <PageShell title="Нагороди" subtitle="Обмінюйте монети на промокоди від партнерів" actions={<BalancePill />}>
      <RewardShop />
    </PageShell>
  );
}
