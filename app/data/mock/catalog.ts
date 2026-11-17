import {mockBusiness, type MockBusiness} from './businesses';
import {searchBusiness} from './search';

/**
 * One lookup for every mock business: the 8 shared records plus the extra ones the search screens add.
 * Pages that open a business by id (profile, compare, saved, requests) go through this.
 */
export function findBusiness(id: string | null | undefined): MockBusiness | undefined {
  if (!id) return undefined;
  return searchBusiness(id) ?? mockBusiness(id);
}
