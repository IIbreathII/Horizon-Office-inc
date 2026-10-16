export type Category =
  | 'animals' | 'ecology' | 'elderly' | 'logistics' | 'donation' | 'city';

export type ParticipationStatus =
  | 'joined' | 'in_progress' | 'pending_review' | 'completed' | 'rejected';

export interface Quest {
  id: string;
  title: string;
  description: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  startsAt: string;            // ISO
  durationHours: number;
  slotsTotal: number;
  slotsTaken: number;
  xpReward: number;
  status: 'open' | 'full' | 'finished' | 'cancelled'; // QuestStatus in §8, inlined for the prototype
  organization: { id: string; name: string; logoUrl?: string };
  myParticipation: { status: ParticipationStatus } | null; // for the current user
}
