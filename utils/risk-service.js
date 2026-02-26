import { APP_ERROR_CODES, createAppError } from "@/utils/app-errors";

const RISK_RATE_KEY = "cm_risk_rate_map";
const RISK_BURST_KEY = "cm_risk_burst_map";

const memoryRateMap = Object.create(null);
const memoryBurstMap = Object.create(null);

function readRateMap() {
  try {
    const raw = uni.getStorageSync(RISK_RATE_KEY);
    if (raw && typeof raw === "object") {
      return raw;
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function writeRateMap(map) {
  try {
    uni.setStorageSync(RISK_RATE_KEY, map);
  } catch (e) {
    // ignore
  }
}

function readBurstMap() {
  try {
    const raw = uni.getStorageSync(RISK_BURST_KEY);
    if (raw && typeof raw === "object") {
      return raw;
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function writeBurstMap(map) {
  try {
    uni.setStorageSync(RISK_BURST_KEY, map);
  } catch (e) {
    // ignore
  }
}

function hitRateLimit(key, intervalMs) {
  const now = Date.now();
  const localHitAt = Number(memoryRateMap[key] || 0);
  if (localHitAt && now - localHitAt < intervalMs) {
    return true;
  }

  const store = readRateMap();
  const storedHitAt = Number(store[key] || 0);
  if (storedHitAt && now - storedHitAt < intervalMs) {
    return true;
  }

  memoryRateMap[key] = now;
  store[key] = now;
  writeRateMap(store);
  return false;
}

export function assertActionRateLimit(key, options = {}) {
  const intervalMs = Number(options.intervalMs || 0) || 3000;
  if (!key) {
    return;
  }
  if (hitRateLimit(key, intervalMs)) {
    const message = options.message || "操作过于频繁，请稍后再试";
    throw createAppError(APP_ERROR_CODES.RATE_LIMIT, message);
  }
}

function trimTimestamps(timestamps, windowMs, now) {
  if (!Array.isArray(timestamps)) {
    return [];
  }
  return timestamps
    .map((v) => Number(v || 0))
    .filter((v) => v > 0 && now - v <= windowMs);
}

export function assertActionBurstLimit(key, options = {}) {
  if (!key) {
    return;
  }

  const windowMs = Number(options.windowMs || 0) || 10000;
  const maxCount = Number(options.maxCount || 0) || 5;
  const message = options.message || "操作过于频繁，请稍后再试";
  const now = Date.now();

  const store = readBurstMap();
  const memoryList = trimTimestamps(memoryBurstMap[key] || [], windowMs, now);
  const storedList = trimTimestamps(store[key] || [], windowMs, now);
  const merged = trimTimestamps([...memoryList, ...storedList], windowMs, now).sort((a, b) => a - b);

  if (merged.length >= maxCount) {
    throw createAppError(APP_ERROR_CODES.RATE_LIMIT, message);
  }

  merged.push(now);
  memoryBurstMap[key] = merged;
  store[key] = merged;
  writeBurstMap(store);
}

export function assertTextLength(text, maxLength, message = "内容长度超出限制") {
  if (typeof maxLength !== "number" || maxLength <= 0) {
    return;
  }
  if (String(text || "").length > maxLength) {
    throw createAppError(APP_ERROR_CODES.INVALID_PARAM, message);
  }
}
