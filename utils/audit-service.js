import { getCloudDatabase } from "@/utils/cloud";
import { getCurrentUserId, generateId } from "@/utils/common";

const AUDIT_KEY = "cm_audit_logs";
const AUDIT_LIMIT = 500;

function getAuditCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("audit_logs") : null;
}

function normalizePayload(payload = {}) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch (e) {
    return {};
  }
}

function appendLocalAuditLog(record) {
  try {
    const list = uni.getStorageSync(AUDIT_KEY) || [];
    const next = Array.isArray(list) ? list : [];
    next.unshift(record);
    if (next.length > AUDIT_LIMIT) {
      next.length = AUDIT_LIMIT;
    }
    uni.setStorageSync(AUDIT_KEY, next);
  } catch (e) {
    // 审计日志不影响业务主流程
  }
}

function normalizeAuditRecord(item = {}) {
  return {
    id: item.id || item._id || generateId("audit"),
    action: item.action || "",
    userId: item.userId || "unknown",
    payload: normalizePayload(item.payload || {}),
    createdAt: Number(item.createdAt || Date.now())
  };
}

function readLocalAuditLogs() {
  try {
    const raw = uni.getStorageSync(AUDIT_KEY) || [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((item) => normalizeAuditRecord(item));
  } catch (e) {
    return [];
  }
}

export async function logAuditEvent(action, payload = {}) {
  if (!action) {
    return;
  }

  const now = Date.now();
  const record = {
    id: generateId("audit"),
    action,
    userId: getCurrentUserId() || payload.userId || "unknown",
    payload: normalizePayload(payload),
    createdAt: now
  };

  appendLocalAuditLog(record);

  const collection = getAuditCollection();
  if (!collection) {
    return;
  }

  await collection.add({ data: record }).catch(() => null);
}

export async function listAuditLogs(options = {}) {
  const {
    action = "",
    userId = "",
    page = 1,
    pageSize = 50
  } = options;
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 50));
  const skip = (safePage - 1) * safePageSize;

  const collection = getAuditCollection();
  if (collection) {
    let query = collection;
    if (action && userId) {
      query = query.where({ action, userId });
    } else if (action) {
      query = query.where({ action });
    } else if (userId) {
      query = query.where({ userId });
    }

    const res = await query
      .orderBy("createdAt", "desc")
      .skip(skip)
      .limit(safePageSize)
      .get()
      .catch(() => null);

    if (res && Array.isArray(res.data)) {
      return res.data.map((item) => normalizeAuditRecord(item));
    }
  }

  const filtered = readLocalAuditLogs().filter((item) => {
    if (action && item.action !== action) {
      return false;
    }
    if (userId && item.userId !== userId) {
      return false;
    }
    return true;
  });
  return filtered.slice(skip, skip + safePageSize);
}

function inRange(ts, since, until) {
  const t = Number(ts || 0);
  if (since && t < since) {
    return false;
  }
  if (until && t > until) {
    return false;
  }
  return true;
}

function buildAuditSummary(logs = []) {
  const byAction = {};
  const byUser = {};
  logs.forEach((item) => {
    if (item.action) {
      byAction[item.action] = Number(byAction[item.action] || 0) + 1;
    }
    if (item.userId) {
      byUser[item.userId] = Number(byUser[item.userId] || 0) + 1;
    }
  });
  return {
    total: logs.length,
    byAction,
    byUser
  };
}

export async function getAuditStats(options = {}) {
  const {
    action = "",
    userId = "",
    since = 0,
    until = 0,
    maxRecords = AUDIT_LIMIT
  } = options;
  const safeMax = Math.min(1000, Math.max(1, Number(maxRecords) || AUDIT_LIMIT));

  const all = await listAuditLogs({
    action,
    userId,
    page: 1,
    pageSize: safeMax
  });
  const sinceNum = Number(since || 0) || 0;
  const untilNum = Number(until || 0) || 0;
  const ranged = all.filter((item) => inRange(item.createdAt, sinceNum, untilNum));

  return buildAuditSummary(ranged);
}

function toCsvCell(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportAuditLogs(options = {}) {
  const {
    action = "",
    userId = "",
    since = 0,
    until = 0,
    format = "json",
    maxRecords = AUDIT_LIMIT
  } = options;
  const safeMax = Math.min(1000, Math.max(1, Number(maxRecords) || AUDIT_LIMIT));

  const all = await listAuditLogs({
    action,
    userId,
    page: 1,
    pageSize: safeMax
  });

  const sinceNum = Number(since || 0) || 0;
  const untilNum = Number(until || 0) || 0;
  const ranged = all.filter((item) => inRange(item.createdAt, sinceNum, untilNum));

  if (format === "csv") {
    const header = "id,action,userId,createdAt,payload";
    const rows = ranged.map((item) =>
      [
        toCsvCell(item.id),
        toCsvCell(item.action),
        toCsvCell(item.userId),
        toCsvCell(item.createdAt),
        toCsvCell(JSON.stringify(item.payload || {}))
      ].join(",")
    );
    return {
      format: "csv",
      filename: `audit-logs-${Date.now()}.csv`,
      count: ranged.length,
      content: [header, ...rows].join("\n")
    };
  }

  return {
    format: "json",
    filename: `audit-logs-${Date.now()}.json`,
    count: ranged.length,
    content: JSON.stringify(
      {
        summary: buildAuditSummary(ranged),
        list: ranged
      },
      null,
      2
    )
  };
}
