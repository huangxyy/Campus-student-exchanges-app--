import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";

import { sanitizeText } from "@/utils/sanitize";
import { addPoints } from "@/utils/points-service";
import { recordOrderCompletion, recordOrderCancellation, updateAvgRating } from "@/utils/trust-service";
import { updateProductStatus } from "@/utils/product-service";
import { logAuditEvent } from "@/utils/audit-service";
import { assertActionBurstLimit, assertActionRateLimit, assertTextLength } from "@/utils/risk-service";
import { APP_ERROR_CODES, createAppError } from "@/utils/app-errors";

const ORDERS_KEY = "cm_orders";
const REVIEWS_KEY = "cm_reviews";

const ORDER_EXPIRE_MS = 24 * 60 * 60 * 1000;

const CANCEL_REASONS = [
  { value: "buyer_changed_mind", label: "买家不想买了" },
  { value: "seller_unavailable", label: "卖家无法交易" },
  { value: "price_disagreement", label: "价格未达成一致" },
  { value: "item_defect", label: "商品与描述不符" },
  { value: "schedule_conflict", label: "时间无法协调" },
  { value: "other", label: "其他原因" }
];

function normalizeOrder(item = {}) {
  return {
    id: item.id || item._id || generateId("order"),
    productId: item.productId || "",
    productTitle: item.productTitle || "",
    productPrice: Number(item.productPrice || 0),
    buyerId: item.buyerId || "",
    buyerName: item.buyerName || "买家",
    sellerId: item.sellerId || "",
    sellerName: item.sellerName || "卖家",
    status: item.status || "pending",
    expireAt: item.expireAt || null,
    meetConfirmedAt: item.meetConfirmedAt || null,
    paidConfirmedAt: item.paidConfirmedAt || null,
    receivedConfirmedAt: item.receivedConfirmedAt || null,
    cancelledAt: item.cancelledAt || null,
    cancelledBy: item.cancelledBy || "",
    cancelReason: item.cancelReason || "",
    completedAt: item.completedAt || null,
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  };
}

function normalizeReview(item = {}) {
  return {
    id: item.id || item._id || generateId("review"),
    orderId: item.orderId || "",
    fromUserId: item.fromUserId || "",
    fromUserName: item.fromUserName || "",
    toUserId: item.toUserId || "",
    toUserName: item.toUserName || "",
    score: Math.min(5, Math.max(1, Number(item.score || 5))),
    content: sanitizeText(item.content || "", { maxLength: 500 }),
    anonymous: !!item.anonymous,
    createdAt: item.createdAt || Date.now()
  };
}

const ORDER_STATUS_TRANSITIONS = {
  pending: ["meet_confirmed", "cancelled"],
  meet_confirmed: ["paid_confirmed", "cancelled"],
  paid_confirmed: ["received_confirmed", "cancelled"],
  received_confirmed: ["completed"],
  completed: [],
  cancelled: []
};

function isOrderTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function canOperateOrder(order, userId, nextStatus) {
  if (!order || !userId) {
    return false;
  }
  if (nextStatus === "cancelled") {
    return order.buyerId === userId || order.sellerId === userId;
  }
  if (nextStatus === "meet_confirmed") {
    return order.buyerId === userId || order.sellerId === userId;
  }
  if (nextStatus === "paid_confirmed") {
    return order.sellerId === userId;
  }
  if (nextStatus === "received_confirmed") {
    return order.buyerId === userId;
  }
  if (nextStatus === "completed") {
    return order.buyerId === userId || order.sellerId === userId;
  }
  return false;
}

function isOrderExpired(order) {
  if (!order || !order.expireAt) {
    return false;
  }
  return Date.now() > Number(order.expireAt) && ["pending", "meet_confirmed"].includes(order.status);
}

function readOrders() {
  try {
    return uni.getStorageSync(ORDERS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveOrders(list) {
  uni.setStorageSync(ORDERS_KEY, list);
}

function readReviews() {
  try {
    return uni.getStorageSync(REVIEWS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveReviews(list) {
  uni.setStorageSync(REVIEWS_KEY, list);
}

function getOrderCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("orders");
}

function getReviewCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("reviews");
}

function hasActiveOrderForProduct(productId, excludeOrderId) {
  const list = readOrders().map((item) => normalizeOrder(item));
  return list.some(
    (o) =>
      o.productId === productId &&
      o.id !== excludeOrderId &&
      !["completed", "cancelled"].includes(o.status)
  );
}

const inFlightOrderCreate = new Set();

function getCreateOrderLockKey(productId, buyerId) {
  return `order:create:${productId || "unknown"}:${buyerId || "anonymous"}`;
}

async function hasActiveOrderForProductInCloud(productId) {
  const collection = getOrderCollection();
  if (!collection) {
    return false;
  }
  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection
    .where({
      productId,
      status: _.nin(["completed", "cancelled"])
    })
    .limit(1)
    .get()
    .catch(() => null);
  return !!(res && res.data && res.data.length > 0);
}

function applyExpireCheck(order) {
  if (!order) {
    return order;
  }
  if (isOrderExpired(order)) {
    return {
      ...order,
      status: "cancelled",
      cancelledAt: Number(order.expireAt),
      cancelledBy: "system",
      cancelReason: "超时自动取消",
      updatedAt: Number(order.expireAt)
    };
  }
  return order;
}

async function persistExpireCancellation(order) {
  if (!order || order.status !== "cancelled" || order.cancelledBy !== "system") {
    return;
  }

  const collection = getOrderCollection();
  if (collection) {
    await collection
      .doc(order.id)
      .update({
        data: {
          status: "cancelled",
          cancelledAt: order.cancelledAt,
          cancelledBy: "system",
          cancelReason: "超时自动取消",
          updatedAt: order.cancelledAt
        }
      })
      .catch(() => null);
  } else {
    const list = readOrders();
    const idx = list.findIndex((item) => (item.id || item._id) === order.id);
    if (idx >= 0) {
      list.splice(idx, 1, { ...list[idx], ...order });
      saveOrders(list);
    }
  }

  if (order.productId) {
    updateProductStatus(order.productId, "available", { force: true }).catch(() => null);
  }
}

// --- Cloud operations ---

async function createOrderInCloud(payload) {
  const collection = getOrderCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const now = Date.now();
  const data = {
    productId: payload.productId,
    productTitle: payload.productTitle || "",
    productPrice: Number(payload.productPrice || 0),
    buyerId: payload.buyerId,
    buyerName: payload.buyerName || "买家",
    sellerId: payload.sellerId,
    sellerName: payload.sellerName || "卖家",
    status: "pending",
    expireAt: now + ORDER_EXPIRE_MS,
    meetConfirmedAt: null,
    paidConfirmedAt: null,
    receivedConfirmedAt: null,
    cancelledAt: null,
    cancelledBy: "",
    cancelReason: "",
    completedAt: null,
    createdAt: now,
    updatedAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeOrder({ ...data, _id: addRes._id });
}

async function listMyOrdersFromCloud(userId) {
  const collection = getOrderCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection
    .where(_.or([{ buyerId: userId }, { sellerId: userId }]))
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return (res.data || []).map((item) => normalizeOrder(item));
}

async function getOrderFromCloud(orderId) {
  const collection = getOrderCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(orderId).get().catch(() => null);
  if (!res || !res.data) {
    return null;
  }
  return normalizeOrder(res.data);
}

async function updateOrderStatusInCloud(orderId, status, userId, extra = {}) {
  const collection = getOrderCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }
  const current = await getOrderFromCloud(orderId);
  if (!current) {
    return false;
  }

  if (isOrderExpired(current)) {
    await persistExpireCancellation(applyExpireCheck(current));
    return false;
  }

  if (!isOrderTransitionAllowed(current.status, status)) {
    return false;
  }

  if (!canOperateOrder(current, userId, status)) {
    return false;
  }

  const now = Date.now();
  const patch = { status, updatedAt: now };
  if (status === "meet_confirmed") {
    patch.meetConfirmedAt = now;
    patch.expireAt = null;
  }
  if (status === "paid_confirmed") {
    patch.paidConfirmedAt = now;
  }
  if (status === "received_confirmed") {
    patch.receivedConfirmedAt = now;
  }
  if (status === "completed") {
    patch.completedAt = now;
  }
  if (status === "cancelled") {
    patch.cancelledAt = now;
    patch.cancelledBy = userId;
    patch.cancelReason = extra.cancelReason || "";
  }

  const res = await collection
    .where({
      _id: orderId,
      status: current.status,
      updatedAt: Number(current.updatedAt || 0)
    })
    .update({ data: patch })
    .catch(() => null);
  if (!res || !res.stats || res.stats.updated <= 0) {
    // 条件更新失败通常表示并发改动，回读后再判断是否已经处于目标状态
    const latest = await collection.doc(orderId).get().catch(() => null);
    const latestOrder = latest && latest.data ? normalizeOrder(latest.data) : null;
    if (latestOrder && latestOrder.status === status) {
      return true;
    }
    return false;
  }
  return !!(res && res.stats && res.stats.updated > 0);
}

async function submitReviewToCloud(payload) {
  const collection = getReviewCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const existing = await collection
    .where({ orderId: payload.orderId, fromUserId: payload.fromUserId })
    .limit(1)
    .get()
    .catch(() => null);

  if (existing && existing.data && existing.data.length > 0) {
    throw createAppError(APP_ERROR_CODES.INVALID_STATE, "Already reviewed");
  }

  const now = Date.now();
  const data = {
    orderId: payload.orderId,
    fromUserId: payload.fromUserId,
    fromUserName: payload.fromUserName || "",
    toUserId: payload.toUserId,
    toUserName: payload.toUserName || "",
    score: Math.min(5, Math.max(1, Number(payload.score || 5))),
    content: payload.content || "",
    anonymous: !!payload.anonymous,
    createdAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeReview({ ...data, _id: addRes._id });
}

async function getOrderReviewsFromCloud(orderId) {
  const collection = getReviewCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection
    .where({ orderId })
    .orderBy("createdAt", "asc")
    .limit(10)
    .get();

  return (res.data || []).map((item) => normalizeReview(item));
}

async function computeUserAvgRating(userId) {
  const reviews = [];

  const collection = getReviewCollection();
  if (collection) {
    const res = await collection.where({ toUserId: userId }).limit(200).get().catch(() => null);
    if (res && res.data) {
      reviews.push(...res.data);
    }
  } else {
    const all = readReviews().filter((r) => r.toUserId === userId);
    reviews.push(...all);
  }

  if (reviews.length === 0) {
    return 0;
  }
  const total = reviews.reduce((sum, r) => sum + Math.min(5, Math.max(1, Number(r.score || 5))), 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

// --- Exported API ---

export async function createOrder(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "User is not logged in");
  }

  assertActionRateLimit(`order:create:${userId}:${payload?.productId || ""}`, {
    intervalMs: 2500,
    message: "下单过于频繁，请稍后再试"
  });

  const lockKey = getCreateOrderLockKey(payload.productId, userId);
  if (inFlightOrderCreate.has(lockKey)) {
    throw createAppError(APP_ERROR_CODES.DUPLICATE_SUBMIT, "请勿重复下单，订单正在创建中");
  }
  inFlightOrderCreate.add(lockKey);

  try {
    if (payload.productId) {
      const cloudDup = await hasActiveOrderForProductInCloud(payload.productId).catch(() => false);
      if (cloudDup) {
        throw createAppError(APP_ERROR_CODES.INVALID_STATE, "该商品已有进行中的订单");
      }
      if (hasActiveOrderForProduct(payload.productId)) {
        throw createAppError(APP_ERROR_CODES.INVALID_STATE, "该商品已有进行中的订单");
      }
    }

    const profile = getCurrentProfile();
    const fullPayload = {
      ...payload,
      buyerId: userId,
      buyerName: profile.nickName || "买家"
    };

    const cloudOrder = await createOrderInCloud(fullPayload).catch(() => null);
    if (cloudOrder) {
      if (payload.productId) {
        updateProductStatus(payload.productId, "reserved", { force: true }).catch(() => null);
      }
      logAuditEvent("order_create_success", {
        orderId: cloudOrder.id,
        productId: cloudOrder.productId,
        buyerId: cloudOrder.buyerId,
        sellerId: cloudOrder.sellerId,
        channel: "cloud"
      }).catch(() => null);
      return cloudOrder;
    }

    const now = Date.now();
    const order = normalizeOrder({
      ...fullPayload,
      id: generateId("order"),
      status: "pending",
      expireAt: now + ORDER_EXPIRE_MS,
      createdAt: now,
      updatedAt: now
    });
    const list = readOrders();
    list.unshift(order);
    saveOrders(list);

    if (payload.productId) {
      updateProductStatus(payload.productId, "reserved", { force: true }).catch(() => null);
    }

    logAuditEvent("order_create_success", {
      orderId: order.id,
      productId: order.productId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      channel: "local"
    }).catch(() => null);
    await wait();
    return order;
  } finally {
    inFlightOrderCreate.delete(lockKey);
  }
}

export async function listMyOrders() {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cloudList = await listMyOrdersFromCloud(userId).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  return readOrders()
    .map((item) => normalizeOrder(item))
    .filter((item) => item.buyerId === userId || item.sellerId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getOrder(orderId) {
  if (!orderId) {
    return null;
  }

  const userId = getCurrentUserId();

  const cloudOrder = await getOrderFromCloud(orderId).catch(() => null);
  if (cloudOrder) {
    if (userId && cloudOrder.buyerId !== userId && cloudOrder.sellerId !== userId) {
      return null;
    }
    const checked = applyExpireCheck(cloudOrder);
    if (checked.status === "cancelled" && checked.cancelledBy === "system" && cloudOrder.status !== "cancelled") {
      persistExpireCancellation(checked).catch(() => null);
    }
    return checked;
  }

  await wait(30);
  let order = readOrders()
    .map((item) => normalizeOrder(item))
    .find((item) => item.id === orderId) || null;

  if (order && userId && order.buyerId !== userId && order.sellerId !== userId) {
    return null;
  }

  if (order) {
    const checked = applyExpireCheck(order);
    if (checked.status === "cancelled" && checked.cancelledBy === "system" && order.status !== "cancelled") {
      persistExpireCancellation(checked).catch(() => null);
    }
    return checked;
  }
  return order;
}

export async function updateOrderStatus(orderId, status, extra = {}) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }
  assertActionRateLimit(`order:status:${userId}:${orderId}:${status}`, {
    intervalMs: 1000,
    message: "操作过于频繁，请稍后再试"
  });
  assertActionBurstLimit(`order:status:target:${userId}:${orderId}`, {
    windowMs: 10000,
    maxCount: 5,
    message: "订单操作过于频繁，请稍后再试"
  });

  const orderForSideEffects = await getOrder(orderId).catch(() => null);

  const cloudResult = await updateOrderStatusInCloud(orderId, status, userId, extra).catch(() => null);
  if (typeof cloudResult === "boolean") {
    if (cloudResult) {
      handleStatusSideEffects(status, orderId, orderForSideEffects, userId, extra);
      logAuditEvent("order_status_changed", {
        orderId,
        fromStatus: orderForSideEffects?.status || "",
        toStatus: status,
        operatorUserId: userId,
        cancelReason: extra.cancelReason || "",
        channel: "cloud"
      }).catch(() => null);
    } else {
      logAuditEvent("order_status_change_rejected", {
        orderId,
        fromStatus: orderForSideEffects?.status || "",
        toStatus: status,
        operatorUserId: userId,
        reason: "cloud_condition_conflict_or_invalid"
      }).catch(() => null);
      return false;
    }
    return cloudResult;
  }

  const list = readOrders();
  const idx = list.findIndex((item) => item.id === orderId);
  if (idx < 0) {
    logAuditEvent("order_status_change_rejected", {
      orderId,
      toStatus: status,
      operatorUserId: userId,
      reason: "order_not_found_local"
    }).catch(() => null);
    return false;
  }

  const current = normalizeOrder(list[idx]);

  if (isOrderExpired(current)) {
    const expired = applyExpireCheck(current);
    list.splice(idx, 1, expired);
    saveOrders(list);
    if (current.productId) {
      updateProductStatus(current.productId, "available", { force: true }).catch(() => null);
    }
    return false;
  }

  if (!isOrderTransitionAllowed(current.status, status)) {
    logAuditEvent("order_status_change_rejected", {
      orderId,
      fromStatus: current.status,
      toStatus: status,
      operatorUserId: userId,
      reason: "transition_not_allowed"
    }).catch(() => null);
    return false;
  }
  if (!canOperateOrder(current, userId, status)) {
    logAuditEvent("order_status_change_rejected", {
      orderId,
      fromStatus: current.status,
      toStatus: status,
      operatorUserId: userId,
      reason: "permission_denied"
    }).catch(() => null);
    return false;
  }

  const now = Date.now();
  const patch = { status, updatedAt: now };
  if (status === "meet_confirmed") {
    patch.meetConfirmedAt = now;
    patch.expireAt = null;
  }
  if (status === "paid_confirmed") {
    patch.paidConfirmedAt = now;
  }
  if (status === "received_confirmed") {
    patch.receivedConfirmedAt = now;
  }
  if (status === "completed") {
    patch.completedAt = now;
  }
  if (status === "cancelled") {
    patch.cancelledAt = now;
    patch.cancelledBy = userId;
    patch.cancelReason = extra.cancelReason || "";
  }

  list.splice(idx, 1, { ...current, ...patch });
  saveOrders(list);

  handleStatusSideEffects(status, orderId, current, userId, extra);
  logAuditEvent("order_status_changed", {
    orderId,
    fromStatus: current.status,
    toStatus: status,
    operatorUserId: userId,
    cancelReason: extra.cancelReason || "",
    channel: "local"
  }).catch(() => null);

  await wait();
  return true;
}

function handleStatusSideEffects(status, orderId, order, userId, extra = {}) {
  if (status === "completed") {
    addPoints("complete_order", orderId).catch(() => null);
    recordOrderCompletion().catch(() => null);
    if (order && order.productId) {
      updateProductStatus(order.productId, "sold", { force: true }).catch(() => null);
    }
  }

  if (status === "cancelled") {
    if (order && order.productId) {
      updateProductStatus(order.productId, "available", { force: true }).catch(() => null);
    }
    const wasPaid = order && (order.status === "paid_confirmed" || order.paidConfirmedAt);
    if (wasPaid) {
      recordOrderCancellation(userId).catch(() => null);
    }
  }
}

export async function submitReview(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "User is not logged in");
  }

  assertActionRateLimit(`order:review:${userId}:${payload?.orderId || ""}`, {
    intervalMs: 2000,
    message: "评价提交过于频繁，请稍后再试"
  });
  assertTextLength(payload?.content || "", 500, "评价内容过长");

  if (payload.orderId) {
    const order = await getOrder(payload.orderId).catch(() => null);
    if (order && order.status !== "completed") {
      throw createAppError(APP_ERROR_CODES.INVALID_STATE, "订单尚未完成，无法评价");
    }
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    fromUserId: userId,
    fromUserName: profile.nickName || "校园用户"
  };

  const cloudReview = await submitReviewToCloud(fullPayload).catch(() => null);
  if (cloudReview) {
    addPoints("submit_review", cloudReview.id).catch(() => null);
    syncReviewToTrust(fullPayload.toUserId);
    return cloudReview;
  }

  const existing = readReviews();
  const alreadyReviewed = existing.some(
    (r) => r.orderId === fullPayload.orderId && r.fromUserId === fullPayload.fromUserId
  );
  if (alreadyReviewed) {
    throw createAppError(APP_ERROR_CODES.INVALID_STATE, "Already reviewed");
  }

  const review = normalizeReview({
    ...fullPayload,
    id: generateId("review"),
    createdAt: Date.now()
  });
  existing.push(review);
  saveReviews(existing);
  addPoints("submit_review", review.id).catch(() => null);
  syncReviewToTrust(fullPayload.toUserId);
  await wait();
  return review;
}

async function syncReviewToTrust(toUserId) {
  if (!toUserId) {
    return;
  }
  try {
    const avg = await computeUserAvgRating(toUserId);
    if (avg > 0) {
      await updateAvgRating(toUserId, avg);
    }
  } catch (e) {
    console.warn("[OrderService] syncReviewToTrust failed:", e);
  }
}

export async function getOrderReviews(orderId) {
  if (!orderId) {
    return [];
  }

  const cloudReviews = await getOrderReviewsFromCloud(orderId).catch(() => null);
  if (cloudReviews) {
    return cloudReviews;
  }

  await wait(30);
  return readReviews()
    .map((item) => normalizeReview(item))
    .filter((item) => item.orderId === orderId);
}

export function getOrderStatusText(status) {
  const map = {
    pending: "待确认",
    meet_confirmed: "已约见",
    paid_confirmed: "已付款",
    received_confirmed: "已收货",
    completed: "已完成",
    cancelled: "已取消"
  };
  return map[status] || "未知状态";
}

export { CANCEL_REASONS };
