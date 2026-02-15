import { getStoredUser } from "@/utils/auth";
import { getCloudDatabase } from "@/utils/cloud";

const LEDGER_KEY = "cm_points_ledger";
const CHECKIN_KEY = "cm_checkin_record";

function getCurrentProfile() {
  return getStoredUser() || {};
}

function getCurrentUserId() {
  return getCurrentProfile().userId || "";
}

function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLedgerEntry(item = {}) {
  return {
    id: item.id || item._id || `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: item.userId || "",
    change: Number(item.change || 0),
    reason: item.reason || "",
    bizType: item.bizType || "other",
    bizId: item.bizId || "",
    createdAt: item.createdAt || Date.now()
  };
}

function readLedger(userId) {
  try {
    const all = uni.getStorageSync(LEDGER_KEY) || [];
    return all.filter((item) => item.userId === userId);
  } catch (error) {
    return [];
  }
}

function saveLedgerEntry(entry) {
  try {
    const all = uni.getStorageSync(LEDGER_KEY) || [];
    all.push(entry);
    uni.setStorageSync(LEDGER_KEY, all);
  } catch (error) {
    // ignore
  }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCheckinRecord(userId) {
  try {
    const all = uni.getStorageSync(CHECKIN_KEY) || {};
    return all[userId] || {};
  } catch (error) {
    return {};
  }
}

function saveCheckinRecord(userId, record) {
  try {
    const all = uni.getStorageSync(CHECKIN_KEY) || {};
    all[userId] = record;
    uni.setStorageSync(CHECKIN_KEY, all);
  } catch (error) {
    // ignore
  }
}

function getLedgerCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("points_ledger") : null;
}

// --- Cloud operations ---

async function addPointsToCloud(userId, change, reason, bizType, bizId) {
  const collection = getLedgerCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const now = Date.now();
  const data = { userId, change, reason, bizType, bizId: bizId || "", createdAt: now };
  const addRes = await collection.add({ data });
  return normalizeLedgerEntry({ ...data, _id: addRes._id });
}

async function getLedgerFromCloud(userId) {
  const collection = getLedgerCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection
    .where({ userId })
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return (res.data || []).map((item) => normalizeLedgerEntry(item));
}

async function getRankingFromCloud(limit = 20) {
  const collection = getLedgerCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.orderBy("createdAt", "desc").limit(1000).get();
  const entries = (res.data || []).map((item) => normalizeLedgerEntry(item));

  const userTotals = {};
  entries.forEach((e) => {
    if (!userTotals[e.userId]) {
      userTotals[e.userId] = { userId: e.userId, total: 0 };
    }
    userTotals[e.userId].total += e.change;
  });

  return Object.values(userTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// --- Points rules ---

const POINTS_RULES = {
  checkin: { change: 5, reason: "每日签到" },
  publish_product: { change: 10, reason: "发布商品" },
  complete_order: { change: 15, reason: "完成交易" },
  publish_task: { change: 8, reason: "发布任务" },
  complete_task: { change: 12, reason: "完成任务" },
  publish_feed: { change: 5, reason: "发布动态" },
  submit_review: { change: 3, reason: "提交评价" }
};

// --- Exported API ---

export async function getMyPoints() {
  const userId = getCurrentUserId();
  if (!userId) {
    return { total: 0, entries: [] };
  }

  const cloudEntries = await getLedgerFromCloud(userId).catch(() => null);
  if (cloudEntries) {
    const total = cloudEntries.reduce((sum, e) => sum + e.change, 0);
    return { total, entries: cloudEntries };
  }

  await wait(30);
  const entries = readLedger(userId).map((item) => normalizeLedgerEntry(item));
  const total = entries.reduce((sum, e) => sum + e.change, 0);
  return { total, entries: entries.sort((a, b) => b.createdAt - a.createdAt) };
}

export async function addPoints(bizType, bizId) {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const rule = POINTS_RULES[bizType];
  if (!rule) {
    return null;
  }

  const cloudEntry = await addPointsToCloud(userId, rule.change, rule.reason, bizType, bizId).catch(() => null);
  if (cloudEntry) {
    return cloudEntry;
  }

  const entry = normalizeLedgerEntry({
    userId,
    change: rule.change,
    reason: rule.reason,
    bizType,
    bizId: bizId || "",
    createdAt: Date.now()
  });
  saveLedgerEntry(entry);
  return entry;
}

export async function checkin() {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const todayKey = getTodayKey();
  const record = getCheckinRecord(userId);
  if (record.lastDate === todayKey) {
    throw new Error("Already checked in today");
  }

  const entry = await addPoints("checkin", todayKey);

  const streak = record.lastDate === getYesterdayKey() ? (record.streak || 0) + 1 : 1;
  saveCheckinRecord(userId, { lastDate: todayKey, streak });

  return { entry, streak };
}

export function getCheckinStatus() {
  const userId = getCurrentUserId();
  if (!userId) {
    return { checkedIn: false, streak: 0 };
  }

  const todayKey = getTodayKey();
  const record = getCheckinRecord(userId);
  return {
    checkedIn: record.lastDate === todayKey,
    streak: record.streak || 0
  };
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getRanking(limit = 20) {
  const cloudRanking = await getRankingFromCloud(limit).catch(() => null);
  if (cloudRanking) {
    return cloudRanking;
  }

  await wait(30);
  const all = (() => {
    try {
      return uni.getStorageSync(LEDGER_KEY) || [];
    } catch (error) {
      return [];
    }
  })();

  const userTotals = {};
  all.forEach((e) => {
    const uid = e.userId;
    if (!uid) {
      return;
    }
    if (!userTotals[uid]) {
      userTotals[uid] = { userId: uid, total: 0 };
    }
    userTotals[uid].total += Number(e.change || 0);
  });

  return Object.values(userTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function getPointsRules() {
  return Object.entries(POINTS_RULES).map(([key, val]) => ({
    type: key,
    change: val.change,
    reason: val.reason
  }));
}
