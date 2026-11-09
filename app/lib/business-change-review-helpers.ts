import type {BusinessProfileInput} from '@otosanayide/core/business-management';

export type Change = {id: string; revisionId: string; profile: BusinessProfileInput; current: BusinessProfileInput | null};
