import type {CaseItem} from '~/lib/review-cases-helpers';

export type Item = CaseItem & {moderationReason?: string; reviewVersion: number; currentVersion: number; review: {text: string; rating: number; reply?: {text: string}; photoIds?: string[]} | null};
