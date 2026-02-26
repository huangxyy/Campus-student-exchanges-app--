/**
 * 全局错误处理与用户提示工具
 * - 统一网络异常、权限拒绝、超时、空数据提示
 * - 防重复提交守卫
 * - 请求超时包装
 */

const ERROR_MAP = {
  NETWORK_ERROR: { title: "网络连接失败", desc: "请检查网络后重试" },
  TIMEOUT: { title: "请求超时", desc: "服务器响应过慢，请稍后再试" },
  PERMISSION_DENIED: { title: "权限不足", desc: "你没有执行此操作的权限" },
  NOT_FOUND: { title: "内容不存在", desc: "该内容已被删除或不可见" },
  AUTH_REQUIRED: { title: "请先登录", desc: "此操作需要登录后才能使用" },
  DUPLICATE_SUBMIT: { title: "请勿重复提交", desc: "你的请求正在处理中" },
  RATE_LIMIT: { title: "操作频繁", desc: "请稍后再试" },
  STATUS_CONFLICT: { title: "状态冲突", desc: "当前数据已变化，已建议刷新后重试" },
  INVALID_PARAM: { title: "参数错误", desc: "提交的数据格式不正确" },
  INVALID_STATE: { title: "状态不合法", desc: "当前状态下无法执行该操作" },
  CLOUD_UNAVAILABLE: { title: "云服务暂不可用", desc: "已切换到本地模式" },
  UNKNOWN: { title: "操作失败", desc: "发生未知错误，请稍后重试" }
};

export function classifyError(error) {
  if (!error) {
    return "UNKNOWN";
  }

  if (typeof error === "object" && error.code && ERROR_MAP[error.code]) {
    return error.code;
  }

  const msg = (error.message || error.errMsg || String(error)).toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "TIMEOUT";
  }
  if (msg.includes("network") || msg.includes("net::") || msg.includes("request:fail")) {
    return "NETWORK_ERROR";
  }
  if (msg.includes("permission") || msg.includes("权限") || msg.includes("forbidden") || msg.includes("403")) {
    return "PERMISSION_DENIED";
  }
  if (msg.includes("not found") || msg.includes("404") || msg.includes("不存在")) {
    return "NOT_FOUND";
  }
  if (msg.includes("login") || msg.includes("auth") || msg.includes("未登录")) {
    return "AUTH_REQUIRED";
  }
  if (msg.includes("cloud") || msg.includes("database") || msg.includes("unavailable")) {
    return "CLOUD_UNAVAILABLE";
  }

  return "UNKNOWN";
}

export function getErrorInfo(code) {
  return ERROR_MAP[code] || ERROR_MAP.UNKNOWN;
}

export function showError(error, options = {}) {
  const code = typeof error === "string" ? error : classifyError(error);
  const info = getErrorInfo(code);
  const title = options.title || info.title;

  uni.showToast({
    title,
    icon: "none",
    duration: options.duration || 2500
  });

  if (options.log !== false) {
    console.warn(`[ErrorHandler] ${code}:`, error);
  }

  return code;
}

export function showErrorModal(error, options = {}) {
  const code = typeof error === "string" ? error : classifyError(error);
  const info = getErrorInfo(code);

  uni.showModal({
    title: options.title || info.title,
    content: options.content || info.desc,
    showCancel: options.showCancel !== undefined ? options.showCancel : false,
    confirmText: options.confirmText || "知道了"
  });

  return code;
}

// --- 防重复提交守卫 ---

const pendingActions = new Set();

export function guardDuplicate(key) {
  if (pendingActions.has(key)) {
    showError("DUPLICATE_SUBMIT");
    return false;
  }
  pendingActions.add(key);
  return true;
}

export function releaseDuplicate(key) {
  pendingActions.delete(key);
}

export async function withGuard(key, fn) {
  if (!guardDuplicate(key)) {
    return null;
  }
  try {
    return await fn();
  } catch (error) {
    showError(error);
    return null;
  } finally {
    releaseDuplicate(key);
  }
}

// --- 请求超时包装 ---

export function withTimeout(promise, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// --- 重试包装 ---

export async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 2;
  const delay = options.delay || 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
    }
  }
}
