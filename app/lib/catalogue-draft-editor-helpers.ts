import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import type {catalogueEvidenceProjection} from '@otosanayide/core/catalogue-draft';

export type Detail = {profile: BusinessProfileInput; profileVersion: number; publicationVersion: number; evidence: ReturnType<typeof catalogueEvidenceProjection>};
