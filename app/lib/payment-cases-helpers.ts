import type {PaymentCaseView} from '@otosanayide/core/payment-cases';

export type CaseWithAmounts = PaymentCaseView & {expected?: {minor: number; currency: string} | null; received?: {minor: number; currency: string} | null};
