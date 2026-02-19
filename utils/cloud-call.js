import { withRetry, withTimeout } from "@/utils/error-handler";

const DEFAULT_TIMEOUT = 8000;

/**
 * 统一云调用包装：超时、重试、日志与回退值。
 */
export async function safeCloudCall(action, cloudFn, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = 0,
    retryDelay = 400,
    fallbackValue = null,
    onError
  } = options;

  try {
    const exec = () => withTimeout(Promise.resolve().then(() => cloudFn()), timeout);
    return await withRetry(exec, {
      maxRetries,
      delay: retryDelay
    });
  } catch (error) {
    if (typeof onError === "function") {
      onError(error);
    } else {
      console.warn(`[CloudCall] ${action} failed`, error);
    }
    return fallbackValue;
  }
}
