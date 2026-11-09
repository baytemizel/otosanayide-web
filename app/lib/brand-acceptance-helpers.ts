import type {brandAcceptanceView} from '@otosanayide/core/brand-acceptance';
import type {brandLedgerView} from '@otosanayide/core/brand-payment-review';

/** Response shape of /api/admin/brand-acceptance (readBrandAcceptance in packages/server plus `enabled`). */
export type BrandAcceptanceData = {
  reservationId: string;
  acceptance: ReturnType<typeof brandAcceptanceView> | null;
  payment: ReturnType<typeof brandLedgerView>;
  eligible: boolean;
  expiresAtMs: number | null;
  checkedAtMs: number;
  enabled: boolean;
};
