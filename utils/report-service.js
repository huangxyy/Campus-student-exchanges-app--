import { getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";

const REPORTS_KEY = "cm_reports";
const REPORT_DEDUP_KEY = "cm_report_dedup";

function normalizeReport(item = {}) {
  return {
    id: item.id || item._id || generateId("report"),
    targetType: item.targetType || "",
    targetId: item.targetId || "",
    reporterId: item.reporterId || "",
    reason: item.reason || "",
    detail: item.detail || "",
    status: item.status || "pending",
    createdAt: item.createdAt || Date.now()
  };
}

function getReportCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("reports") : null;
}

function hasDuplicateReport(userId, targetType, targetId) {
  try {
    const dedupMap = uni.getStorageSync(REPORT_DEDUP_KEY) || {};
    const key = `${userId}:${targetType}:${targetId}`;
    return !!dedupMap[key];
  } catch {
    return false;
  }
}

function markReported(userId, targetType, targetId) {
  try {
    const dedupMap = uni.getStorageSync(REPORT_DEDUP_KEY) || {};
    dedupMap[`${userId}:${targetType}:${targetId}`] = Date.now();
    uni.setStorageSync(REPORT_DEDUP_KEY, dedupMap);
  } catch {
    /* noop */
  }
}

async function submitReportToCloud(payload) {
  const collection = getReportCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const now = Date.now();
  const data = {
    targetType: payload.targetType,
    targetId: payload.targetId,
    reporterId: payload.reporterId,
    reason: payload.reason,
    detail: payload.detail || "",
    status: "pending",
    createdAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeReport({ ...data, _id: addRes._id });
}

export async function submitReport(payload) {
  const userId = getCurrentUserId();
  if (!userId) { throw new Error("User is not logged in"); }

  const fullPayload = {
    ...payload,
    reporterId: userId,
    detail: sanitizeText(payload.detail || "", { maxLength: 500 }),
  };

  if (!fullPayload.targetType || !fullPayload.targetId || !fullPayload.reason) {
    throw new Error("Missing required report fields");
  }

  if (hasDuplicateReport(userId, fullPayload.targetType, fullPayload.targetId)) {
    throw new Error("您已举报过该内容，请勿重复提交");
  }

  const cloudReport = await submitReportToCloud(fullPayload).catch(() => null);
  if (cloudReport) {
    markReported(userId, fullPayload.targetType, fullPayload.targetId);
    return cloudReport;
  }

  const report = normalizeReport({
    ...fullPayload,
    id: generateId("report"),
    createdAt: Date.now()
  });

  try {
    const all = uni.getStorageSync(REPORTS_KEY) || [];
    all.push(report);
    uni.setStorageSync(REPORTS_KEY, all);
  } catch {
    /* noop */
  }

  markReported(userId, fullPayload.targetType, fullPayload.targetId);
  await wait();
  return report;
}

export const REPORT_REASONS = [
  { label: "虚假信息", value: "fake" },
  { label: "违规内容", value: "inappropriate" },
  { label: "广告骚扰", value: "spam" },
  { label: "侵权行为", value: "infringement" },
  { label: "其他", value: "other" }
];
