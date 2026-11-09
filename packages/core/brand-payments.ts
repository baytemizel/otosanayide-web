import {z} from 'zod';import {paymentLookupSchema} from './ad-payments';
export const brandPaymentResult=paymentLookupSchema.extend({amountMinor:z.number().int().nonnegative().max(18_000_000_000)});
export const brandProviderIdentity=z.object({provider:z.string().regex(/^[a-z0-9_-]{1,40}$/),merchantId:z.string().min(1).max(200)}).strict();
