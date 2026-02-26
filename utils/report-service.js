import { getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";
import { logAuditEvent } from "@/utils/audit-service";
import { assertActionBurstLimit, assertActionRateLimit, assertTextLength } from "@/utils/risk-service";
import { APP_ERROR_CODES, createAppError } from "@/utils/app-errors";

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
  if (!userId) { throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "User is not logged in"); }

  assertActionRateLimit(`report:submit:${userId}:${payload?.targetType || ""}:${payload?.targetId || ""}`, {
    intervalMs: 3000,
    message: "举报提交过于频繁，请稍后再试"
  });
  assertActionBurstLimit(`report:submit:target:${userId}:${payload?.targetType || ""}:${payload?.targetId || ""}`, {
    windowMs: 60000,
    maxCount: 3,
    message: "举报提交过于频繁，请稍后再试"
  });
  assertTextLength(payload?.detail || "", 500, "举报详情过长");

  const fullPayload = {
    ...payload,
    reporterId: userId,
    detail: sanitizeText(payload.detail || "", { maxLength: 500 }),
  };

  if (!fullPayload.targetType || !fullPayload.targetId || !fullPayload.reason) {
    throw createAppError(APP_ERROR_CODES.INVALID_PARAM, "Missing required report fields");
  }

  if (hasDuplicateReport(userId, fullPayload.targetType, fullPayload.targetId)) {
    throw createAppError(APP_ERROR_CODES.INVALID_STATE, "您已举报过该内容，请勿重复提交");
  }

  const cloudReport = await submitReportToCloud(fullPayload).catch(() => null);
  if (cloudReport) {
    markReported(userId, fullPayload.targetType, fullPayload.targetId);
    logAuditEvent("report_submitted", {
      reportId: cloudReport.id,
      targetType: cloudReport.targetType,
      targetId: cloudReport.targetId,
      reporterId: userId,
      channel: "cloud"
    }).catch(() => null);
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
  logAuditEvent("report_submitted", {
    reportId: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reporterId: userId,
    channel: "local"
  }).catch(() => null);
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
