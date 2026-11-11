import {apiFetch} from './api';
import {AdRequestError, readAdResponse} from './ads-client';

/**
 * Checked reader for every endpoint added in round three. Same semantics as the ad
 * reader: closed (503), HTML or empty error bodies and 401/403 become a readable
 * ApiError; a success is decoded by a web schema, never by the strict core ones.
 */
export {AdRequestError as ApiError};

export type Call = {method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; token?: string};

export async function callApi<T>(path: string, call: Call, decode: (raw: unknown) => T, request: typeof apiFetch = apiFetch): Promise<T> {
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (call.token) headers.Authorization = 'Bearer ' + call.token;
  if (call.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await request(path, {method: call.method ?? 'GET', headers, cache: 'no-store', ...(call.body === undefined ? {} : {body: JSON.stringify(call.body)})});
  return readAdResponse(response, decode);
}

/** A status-specific message for the codes these screens explain themselves. */
export function errorStatus(error: unknown) {
  return error instanceof AdRequestError ? error.status : 0;
}
