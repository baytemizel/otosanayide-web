import type {Business} from '@otosanayide/core';
import {toggleComparison} from '@otosanayide/core/discovery-tools';

/**
 * Up to three businesses chosen for comparison, shared by the result cards and the
 * comparison panel. Page memory only (product-plan: ücretsiz karşılaştırma); saving a
 * comparison needs an account endpoint (request web-13).
 */
export function useComparison() {
  const selected = useState<Business[]>('comparison', () => []);
  return {
    selected,
    has: (id: string) => selected.value.some(b => b.id === id),
    /** False when a fourth business was refused. */
    toggle(business: Business) {
      try {
        selected.value = toggleComparison(selected.value, business);
        return true;
      } catch {
        return false;
      }
    },
  };
}
