import { RewardShop } from '@/features/rewards/RewardShop';
import { PageShell } from '@/shared/ui/PageShell';

export default function RewardsPage() {
  return (
    <PageShell title="Нагороди">
      <RewardShop />
    </PageShell>
  );
}
