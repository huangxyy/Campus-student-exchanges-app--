/**
 * 公共工具函数
 * - 统一 ID 生成
 * - 通用 getCurrentUserId / wait
 */

import { getStoredUser } from "@/utils/auth";

/**
 * 生成带随机后缀的唯一 ID，避免 Date.now() 碰撞
 * @param {string} prefix ID 前缀
 * @returns {string}
 */
export function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 获取当前登录用户完整 profile（带兜底空对象）
 */
export function getCurrentProfile() {
  return getStoredUser() || {};
}

/**
 * 获取当前登录用户 ID
 */
export function getCurrentUserId() {
  return getCurrentProfile().userId || "";
}

/**
 * 模拟异步延迟（mock 场景用）
 * @param {number} ms 毫秒
 */
export function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 简单频率限制器 — 同一 key 在 interval 内只允许执行一次
 * @param {number} interval 最小间隔 ms，默认 3000
 */
export function createRateLimiter(interval = 3000) {
  const timestamps = {};
  return {
    check(key = "default") {
      const now = Date.now();
      if (timestamps[key] && now - timestamps[key] < interval) {
        return false;
      }
      timestamps[key] = now;
      return true;
    },
    reset(key = "default") {
      delete timestamps[key];
    }
  };
}

/**
 * 节流写入 storage — 高频写入场景（如消息列表）防止阻塞主线程
 * 返回一个 throttledSave(key, data) 函数，连续调用时只保留最后一次写入
 * @param {number} delay 节流间隔 ms
 */
export function createThrottledStorage(delay = 300) {
  const pending = {};
  return {
    save(key, data) {
      if (pending[key]) {
        clearTimeout(pending[key]);
      }
      pending[key] = setTimeout(() => {
        try {
          uni.setStorageSync(key, data);
        } catch (e) {
          console.warn("[ThrottledStorage] write failed:", key, e);
        }
        delete pending[key];
      }, delay);
    },
    flush(key) {
      if (pending[key]) {
        clearTimeout(pending[key]);
        delete pending[key];
      }
    }
  };
}
