import {z} from 'zod';
export const paymentLookupSchema=z.object({paymentId:z.string().min(1).max(200),merchantId:z.string().min(1).max(200),orderId:z.string().uuid(),status:z.enum(['pending','failed','succeeded']),currency:z.string().length(3),amountMinor:z.number().int().nonnegative().max(1_000_000_000),capturedAtMs:z.number().int().nonnegative().nullable()}).strict();
export type PaymentLookup=z.infer<typeof paymentLookupSchema>;
// A server-configured adapter must query the provider directly. Never construct this from a browser redirect or webhook body.
export interface PaymentProvider {name:string;merchantId:string;lookup(paymentId:string):Promise<unknown>}
