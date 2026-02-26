import { getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { APP_ERROR_CODES, createAppError } from "@/utils/app-errors";

const LEDGER_KEY = "cm_points_ledger";
const CHECKIN_KEY = "cm_checkin_record";
const DEDUP_KEY = "cm_points_dedup";

function normalizeLedgerEntry(item = {}) {
  return {
    id: item.id || item._id || generateId("pt"),
    userId: item.userId || "",
    change: Number(item.change || 0),
    reason: item.reason || "",
    bizType: item.bizType || "other",
    bizId: item.bizId || "",
    createdAt: item.createdAt || Date.now()
  };
}

function readLocal(key, fallback) {
  try { return uni.getStorageSync(key) || fallback; }
  catch { return fallback; }
}
function saveLocal(key, value) {
  try { uni.setStorageSync(key, value); }
  catch { /* noop */ }
}

function readLedger(userId) {
  return readLocal(LEDGER_KEY, []).filter((item) => item.userId === userId);
}

function saveLedgerEntry(entry) {
  const all = readLocal(LEDGER_KEY, []);
  all.push(entry);
  saveLocal(LEDGER_KEY, all);
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

function getCheckinRecord(userId) {
  const all = readLocal(CHECKIN_KEY, {});
  return all[userId] || {};
}

function saveCheckinRecord(userId, record) {
  const all = readLocal(CHECKIN_KEY, {});
  all[userId] = record;
  saveLocal(CHECKIN_KEY, all);
}

function isDuplicate(bizType, bizId) {
  if (!bizId) { return false; }
  const key = `${bizType}:${bizId}`;
  const set = readLocal(DEDUP_KEY, {});
  return !!set[key];
}

function markProcessed(bizType, bizId) {
  if (!bizId) { return; }
  const key = `${bizType}:${bizId}`;
  const set = readLocal(DEDUP_KEY, {});
  set[key] = Date.now();
  const keys = Object.keys(set);
  if (keys.length > 500) {
    const sorted = keys.sort((a, b) => set[a] - set[b]);
    sorted.slice(0, keys.length - 300).forEach((k) => delete set[k]);
  }
  saveLocal(DEDUP_KEY, set);
}

function getLedgerCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("points_ledger") : null;
}

// --- Cloud operations ---

async function addPointsToCloud(userId, change, reason, bizType, bizId) {
  const collection = getLedgerCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const now = Date.now();
  const data = { userId, change, reason, bizType, bizId: bizId || "", createdAt: now };
  const addRes = await collection.add({ data });
  return normalizeLedgerEntry({ ...data, _id: addRes._id });
}

async function getLedgerFromCloud(userId) {
  const collection = getLedgerCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const res = await collection
    .where({ userId })
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return (res.data || []).map(normalizeLedgerEntry);
}

async function getRankingFromCloud(limit = 20) {
  const collection = getLedgerCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const batchSize = 100;
  let allEntries = [];
  let hasMore = true;
  let skip = 0;

  while (hasMore && skip < 2000) {
    const res = await collection
      .orderBy("createdAt", "desc")
      .skip(skip)
      .limit(batchSize)
      .get();
    const batch = res.data || [];
    allEntries = allEntries.concat(batch);
    hasMore = batch.length === batchSize;
    skip += batchSize;
  }

  return aggregateRanking(allEntries, limit);
}

function aggregateRanking(entries, limit) {
  const totals = {};
  for (const e of entries) {
    const uid = e.userId || "";
    if (!uid) { continue; }
    if (!totals[uid]) { totals[uid] = { userId: uid, total: 0 }; }
    totals[uid].total += Number(e.change || 0);
  }
  return Object.values(totals)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// --- Points rules ---

const POINTS_RULES = {
  checkin: { change: 5, reason: "每日签到" },
  checkin_streak_bonus: { change: 2, reason: "连续签到奖励" },
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
  if (!userId) { return { total: 0, entries: [] }; }

  const cloudEntries = await getLedgerFromCloud(userId).catch(() => null);
  if (cloudEntries) {
    const total = cloudEntries.reduce((sum, e) => sum + e.change, 0);
    return { total, entries: cloudEntries };
  }

  await wait(30);
  const entries = readLedger(userId).map(normalizeLedgerEntry);
  const total = entries.reduce((sum, e) => sum + e.change, 0);
  return { total, entries: entries.sort((a, b) => b.createdAt - a.createdAt) };
}

export async function addPoints(bizType, bizId) {
  const userId = getCurrentUserId();
  if (!userId) { return null; }

  const rule = POINTS_RULES[bizType];
  if (!rule) { return null; }

  if (isDuplicate(bizType, bizId)) { return null; }

  const cloudEntry = await addPointsToCloud(userId, rule.change, rule.reason, bizType, bizId).catch(() => null);
  if (cloudEntry) {
    markProcessed(bizType, bizId);
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
  markProcessed(bizType, bizId);
  return entry;
}

export async function checkin() {
  const userId = getCurrentUserId();
  if (!userId) { throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "User is not logged in"); }

  const todayKey = getTodayKey();
  const record = getCheckinRecord(userId);
  if (record.lastDate === todayKey) {
    throw createAppError(APP_ERROR_CODES.INVALID_STATE, "Already checked in today");
  }

  const entry = await addPoints("checkin", todayKey);

  const isConsecutive = record.lastDate === getYesterdayKey();
  const streak = isConsecutive ? (record.streak || 0) + 1 : 1;
  saveCheckinRecord(userId, { lastDate: todayKey, streak });

  if (isConsecutive && streak > 0 && streak % 7 === 0) {
    await addPoints("checkin_streak_bonus", `${todayKey}_w${Math.floor(streak / 7)}`).catch(() => null);
  }

  return { entry, streak };
}

export function getCheckinStatus() {
  const userId = getCurrentUserId();
  if (!userId) { return { checkedIn: false, streak: 0 }; }

  const todayKey = getTodayKey();
  const record = getCheckinRecord(userId);
  return {
    checkedIn: record.lastDate === todayKey,
    streak: record.streak || 0
  };
}

export async function getRanking(limit = 20) {
  const cloudRanking = await getRankingFromCloud(limit).catch(() => null);
  if (cloudRanking) { return cloudRanking; }

  await wait(30);
  const all = readLocal(LEDGER_KEY, []);
  return aggregateRanking(all, limit);
}

export function getPointsRules() {
  return Object.entries(POINTS_RULES)
    .filter(([key]) => key !== "checkin_streak_bonus")
    .map(([key, val]) => ({
      type: key,
      change: val.change,
      reason: val.reason
    }));
}

// --- Level (by total points) ---
const LEVELS = [
  { min: 0, name: "校园新人", icon: "🌱", nextAt: 50 },
  { min: 50, name: "活跃用户", icon: "🌿", nextAt: 150 },
  { min: 150, name: "校园达人", icon: "🌟", nextAt: 400 },
  { min: 400, name: "超级达人", icon: "👑", nextAt: 1000 },
  { min: 1000, name: "传奇学长", icon: "🏆", nextAt: Infinity }
];

export function getLevel(total) {
  const t = Number(total) || 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (t >= LEVELS[i].min) return { ...LEVELS[i], level: i + 1 };
  }
  return { ...LEVELS[0], level: 1 };
}

export function getLevelProgress(total) {
  const level = getLevel(total);
  const nextAt = level.nextAt;
  if (nextAt === Infinity) return { level, current: total, need: 0, percent: 100 };
  const prev = LEVELS[level.level - 2];
  const prevMin = prev ? prev.min : 0;
  const need = nextAt - prevMin;
  const current = total - prevMin;
  const percent = Math.min(100, Math.round((current / need) * 100));
  return { level, current: Math.max(0, current), need, percent };
}

// --- Exchange ---
const EXCHANGE_ITEMS = [
  { id: "top", name: "商品置顶 1 天", cost: 50, icon: "📌", desc: "在列表前排展示" },
  { id: "urgent", name: "求购加急推送", cost: 30, icon: "⚡", desc: "优先匹配求购者" },
  { id: "frame", name: "专属头像框", cost: 100, icon: "🖼", desc: "7 天头像框权益" }
];

export function getExchangeItems() {
  return EXCHANGE_ITEMS;
}

export async function exchangePoints(itemId) {
  const userId = getCurrentUserId();
  if (!userId) throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "请先登录");

  const item = EXCHANGE_ITEMS.find((i) => i.id === itemId);
  if (!item) throw createAppError(APP_ERROR_CODES.INVALID_PARAM, "无效的兑换项");

  const { total } = await getMyPoints();
  if (total < item.cost) throw createAppError(APP_ERROR_CODES.INVALID_STATE, "积分不足");

  const coll = getLedgerCollection();
  if (coll) {
    const now = Date.now();
    await coll.add({
      data: {
        userId,
        change: -item.cost,
        reason: `兑换：${item.name}`,
        bizType: "exchange_" + itemId,
        bizId: now + "",
        createdAt: now
      }
    });
    return { success: true, item };
  }

  const entry = normalizeLedgerEntry({
    userId,
    change: -item.cost,
    reason: `兑换：${item.name}`,
    bizType: "exchange_" + itemId,
    bizId: Date.now() + "",
    createdAt: Date.now()
  });
  saveLedgerEntry(entry);
  return { success: true, item };
}
