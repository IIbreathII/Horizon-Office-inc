import type { ClaimStatus, Quest } from '@/shared/types';
import type { StatusTone } from '@/shared/ui/surface';

// Status chip colors for the organization pages (labels live in ./schemas).

export const QUEST_STATUS_TONE: Record<Quest['status'], StatusTone> = {
  open: 'available',
  full: 'full',
  in_progress: 'joined',
  finished: 'completed',
  cancelled: 'danger',
};

export const CLAIM_STATUS_TONE: Record<ClaimStatus, StatusTone> = {
  pending: 'joined',
  approved: 'available',
  completed: 'completed',
  rejected: 'danger',
  withdrawn: 'full',
};
