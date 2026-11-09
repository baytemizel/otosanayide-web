import type {AiModeration, LocalModeration} from '@otosanayide/core/content-moderation';
import type {ReviewView} from './reviews-helpers';

export type ReviewModerationItem = ReviewView & {businessId: string; status: 'pending' | 'approved'; version: number; automatic?: {local: LocalModeration; ai: AiModeration}};
