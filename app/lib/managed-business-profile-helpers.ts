import type {BusinessProfileInput} from '@otosanayide/core/business-management';

export type ManagedBusiness = BusinessProfileInput & {
  id: string;
  version: number;
  change: null | {revisionId: string; status: string; profile: BusinessProfileInput; reason: string};
};
