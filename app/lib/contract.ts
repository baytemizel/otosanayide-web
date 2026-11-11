/**
 * Endpoints this site asked the API for (otosanayide-api/docs/endpoint-requests/web-*.md).
 * The UI is written against the proposed contract and stays passive until the request is
 * marked `done` there; then the matching flag flips to true. Until that API code is deployed,
 * the live API answers 404 and the screen says "not available yet" instead of failing.
 * A request that is `open` or `rejected` keeps its screens passive (K183 rule).
 */
export const contractReady = {
  /** web-01 GET /api/auth/mfa — done (API-A, 11 Nov 2026; code ready, not live). */
  mfaStatus: true,
  /** web-02 POST /api/auth/password/change — done (wrong password is 400, missing TOTP code 403). */
  passwordChange: true,
  /** web-03 POST /api/auth/email/change */
  emailChange: true,
  /** web-04 POST /api/businesses/{id}/reports */
  businessReports: true,
  /** web-11 POST /api/notifications/read-all and GET ?kind= — done. */
  notificationsReadAll: true,
  /** web-17 GET /api/reviews/mine/all (own review list) — done. */
  ownReviewList: true,
  /** web-05/07/08 search and profile v2 (`v=2`, sort, cursor, verifiedOwner, reviewSummary, openingHours) — done. */
  searchV2: true,
  /** web-09 preferences, web-10 data exports, web-12 waitlist, web-13 lists — done. */
  accountExtras: true,
  /** web-15 request messages, availability + preferredSlot, portal-05 offer lines (GET /api/requests?v=2) — done. */
  requestsV2: true,
  /** web-16 admin overview and read-only flags; web-04 admin reports; web-10 admin export queue — done. */
  adminV2: true,
} as const;

export type ContractFeature = keyof typeof contractReady;
