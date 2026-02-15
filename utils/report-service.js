import { getStoredUser } from "@/utils/auth";
import { getCloudDatabase } from "@/utils/cloud";

const REPORTS_KEY = "cm_reports";

function getCurrentUserId() {
  return (getStoredUser() || {}).userId || "";
}

function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeReport(item = {}) {
  return {
    id: item.id || item._id || `report-${Date.now()}`,
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

async function submitReportToCloud(payload) {
  const collection = getReportCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

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
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const fullPayload = { ...payload, reporterId: userId };

  if (!fullPayload.targetType || !fullPayload.targetId || !fullPayload.reason) {
    throw new Error("Missing required report fields");
  }

  const cloudReport = await submitReportToCloud(fullPayload).catch(() => null);
  if (cloudReport) {
    return cloudReport;
  }

  const report = normalizeReport({
    ...fullPayload,
    id: `report-${Date.now()}`,
    createdAt: Date.now()
  });

  try {
    const all = uni.getStorageSync(REPORTS_KEY) || [];
    all.push(report);
    uni.setStorageSync(REPORTS_KEY, all);
  } catch (error) {
    // ignore
  }

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
