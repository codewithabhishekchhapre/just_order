/**
 * Shared HTTP error finalizer for Axios clients.
 * - Normalizes errors
 * - Retries safe GETs with exponential backoff
 * - Deduped user feedback for network / timeout / 5xx / 429
 * Does NOT replace module-specific 401 refresh / logout flows.
 *
 * IMPORTANT: Register this BEFORE the 401 interceptor so Axios LIFO
 * error chain runs auth first, then this finalizer.
 */

import {
  ApiErrorCode,
  classifyApiError,
  isRetryableApiError,
  normalizeApiError,
} from "./errors.js";
import { notifyApiError } from "./networkToast.js";
import { isOnline } from "./networkMonitor.js";

const SLOW_THRESHOLD_MS = 4500;
const MAX_GET_RETRIES = 2;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clearRequestWatchers(config) {
  if (config?.__slowTimer) {
    clearTimeout(config.__slowTimer);
    config.__slowTimer = null;
  }
}

/**
 * Attach slow-network detection on the request config.
 */
export function attachSlowNetworkWatcher(config, onSlow) {
  if (!config || config.skipSlowWarning || config.background) return config;
  clearRequestWatchers(config);
  config.__slowTimer = setTimeout(() => {
    if (!isOnline()) return;
    onSlow?.();
  }, Number(config.slowThresholdMs) || SLOW_THRESHOLD_MS);
  return config;
}

function shouldAutoNotify(error, normalized) {
  if (normalized.silent) return false;
  if (error?.config?.skipErrorToast || error?.config?.silent || error?.config?.background) {
    return false;
  }
  const autoCodes = new Set([
    ApiErrorCode.OFFLINE,
    ApiErrorCode.NETWORK,
    ApiErrorCode.TIMEOUT,
    ApiErrorCode.RATE_LIMITED,
    ApiErrorCode.SERVER,
    ApiErrorCode.SERVICE_UNAVAILABLE,
    ApiErrorCode.GATEWAY_TIMEOUT,
  ]);
  if (autoCodes.has(normalized.code)) return true;
  if (normalized.code === ApiErrorCode.FORBIDDEN && error?.config?.notifyError !== false) {
    return true;
  }
  return error?.config?.notifyError === true;
}

/**
 * @param {import('axios').AxiosInstance} client
 */
export function installHttpErrorHandling(client) {
  client.interceptors.response.use(
    (response) => {
      clearRequestWatchers(response?.config);
      return response;
    },
    async (error) => {
      clearRequestWatchers(error?.config);

      if (error?.__httpHandled) {
        return Promise.reject(error);
      }

      if (!isOnline() && !error?.response) {
        normalizeApiError(error, { code: ApiErrorCode.OFFLINE });
      } else {
        normalizeApiError(error);
      }

      const config = error?.config;
      const method = String(config?.method || "get").toLowerCase();
      const status = error?.response?.status;

      const canRetry =
        config &&
        method === "get" &&
        !config.skipRetry &&
        !config.noRetry &&
        status !== 401 &&
        status !== 403 &&
        status !== 404 &&
        isRetryableApiError(error);

      if (canRetry) {
        const attempt = Number(config._retryCount) || 0;
        if (attempt < MAX_GET_RETRIES) {
          config._retryCount = attempt + 1;
          await delay(400 * 2 ** attempt);
          try {
            return await client.request(config);
          } catch (retryError) {
            error = retryError;
            clearRequestWatchers(error?.config);
            normalizeApiError(error);
          }
        }
      }

      const normalized = error.normalized || normalizeApiError(error);
      if (shouldAutoNotify(error, normalized)) {
        notifyApiError(error);
      }

      error.__httpHandled = true;
      return Promise.reject(error);
    },
  );
}

export function classifyForLog(error) {
  return {
    code: classifyApiError(error),
    status: error?.response?.status || null,
    url: error?.config?.url || null,
    method: error?.config?.method || null,
  };
}
