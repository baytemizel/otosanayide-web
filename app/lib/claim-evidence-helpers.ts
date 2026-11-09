import type {evidenceKinds} from '@otosanayide/core/claim-evidence';

export type Evidence = {id: string; kind: keyof typeof evidenceKinds; bytes: number; expiresAtMs: number};
export type EvidenceList = {enabled: boolean; evidenceRevision: number; pendingUploads: number; items: Evidence[]};
