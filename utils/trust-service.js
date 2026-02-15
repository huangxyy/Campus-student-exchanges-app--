/**
 * 信任体系 / 信用分服务
 * - 信用分计算与更新
 * - 信用等级映射
 * - 云优先 + 本地回退
 */

import { getStoredUser } from "@/utils/auth";
import { getCloudDatabase } from "@/utils/cloud";

const TRUST_KEY = "cm_trust_scores";

function getCurrentUserId() {
  return (getStoredUser() || {}).userId || "";
}

function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTrustRecord(item = {}) {
  return {
    userId: item.userId || "",
    score: Math.max(0, Math.min(100, Number(item.score || 60))),
    completedOrders: Number(item.completedOrders || 0),
    completedTasks: Number(item.completedTasks || 0),
    reportCount: Number(item.reportCount || 0),
    avgRating: Number(item.avgRating || 0),
    updatedAt: item.updatedAt || Date.now()
  };
}

function getScoreLevel(score) {
  if (score >= 90) {
    return { level: "优秀", color: "#10b981", icon: "🌟" };
  }
  if (score >= 75) {
    return { level: "良好", color: "#2f6bff", icon: "⭐" };
  }
  if (score >= 60) {
    return { level: "一般", color: "#f5a623", icon: "☆" };
  }
  return { level: "待提升", color: "#e74a62", icon: "⚠️" };
}

function readLocalScore(userId) {
  try {
    const all = uni.getStorageSync(TRUST_KEY) || {};
    return all[userId] ? normalizeTrustRecord(all[userId]) : null;
  } catch (error) {
    return null;
  }
}

function saveLocalScore(userId, record) {
  try {
    const all = uni.getStorageSync(TRUST_KEY) || {};
    all[userId] = record;
    uni.setStorageSync(TRUST_KEY, all);
  } catch (error) {
    // ignore
  }
}

function getTrustCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("trust_scores") : null;
}

async function getScoreFromCloud(userId) {
  const collection = getTrustCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.where({ userId }).limit(1).get();
  const raw = res.data && res.data[0];
  return raw ? normalizeTrustRecord(raw) : null;
}

async function upsertScoreInCloud(userId, record) {
  const collection = getTrustCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const existing = await getScoreFromCloud(userId).catch(() => null);
  const data = {
    userId,
    score: record.score,
    completedOrders: record.completedOrders,
    completedTasks: record.completedTasks,
    reportCount: record.reportCount,
    avgRating: record.avgRating,
    updatedAt: Date.now()
  };

  if (existing) {
    const docRes = await collection.where({ userId }).limit(1).get();
    const docId = docRes.data[0]._id || docRes.data[0].id;
    await collection.doc(docId).update({ data });
  } else {
    await collection.add({ data });
  }

  return normalizeTrustRecord(data);
}

function computeScore(record) {
  let score = 60;

  // Completed orders boost
  score += Math.min(15, record.completedOrders * 1.5);

  // Completed tasks boost
  score += Math.min(10, record.completedTasks * 1);

  // Average rating boost (1~5)
  if (record.avgRating > 0) {
    score += (record.avgRating - 3) * 4;
  }

  // Report penalty
  score -= record.reportCount * 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// --- Exported API ---

export async function getTrustScore(userId) {
  const targetId = userId || getCurrentUserId();
  if (!targetId) {
    return normalizeTrustRecord({});
  }

  const cloudRecord = await getScoreFromCloud(targetId).catch(() => null);
  if (cloudRecord) {
    saveLocalScore(targetId, cloudRecord);
    return cloudRecord;
  }

  await wait(30);
  return readLocalScore(targetId) || normalizeTrustRecord({ userId: targetId });
}

export async function refreshTrustScore(stats = {}) {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const current = await getTrustScore(userId);
  const updated = {
    ...current,
    completedOrders: stats.completedOrders ?? current.completedOrders,
    completedTasks: stats.completedTasks ?? current.completedTasks,
    reportCount: stats.reportCount ?? current.reportCount,
    avgRating: stats.avgRating ?? current.avgRating
  };
  updated.score = computeScore(updated);
  updated.updatedAt = Date.now();

  const cloudRecord = await upsertScoreInCloud(userId, updated).catch(() => null);
  if (cloudRecord) {
    saveLocalScore(userId, cloudRecord);
    return cloudRecord;
  }

  saveLocalScore(userId, updated);
  return normalizeTrustRecord(updated);
}

export function getTrustLevel(score) {
  return getScoreLevel(score);
}

export async function recordOrderCompletion() {
  const userId = getCurrentUserId();
  if (!userId) { return; }
  const current = await getTrustScore(userId);
  await refreshTrustScore({
    completedOrders: current.completedOrders + 1
  });
}

export async function recordTaskCompletion() {
  const userId = getCurrentUserId();
  if (!userId) { return; }
  const current = await getTrustScore(userId);
  await refreshTrustScore({
    completedTasks: current.completedTasks + 1
  });
}

export async function recordReport() {
  const userId = getCurrentUserId();
  if (!userId) { return; }
  const current = await getTrustScore(userId);
  await refreshTrustScore({
    reportCount: current.reportCount + 1
  });
}
