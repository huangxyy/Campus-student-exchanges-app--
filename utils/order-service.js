import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { showError, withGuard } from "@/utils/error-handler";
import { sanitizeText } from "@/utils/sanitize";
import { addPoints } from "@/utils/points-service";
import { recordOrderCompletion } from "@/utils/trust-service";
import { updateProductStatus } from "@/utils/product-service";

const ORDERS_KEY = "cm_orders";
const REVIEWS_KEY = "cm_reviews";

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
    meetConfirmedAt: item.meetConfirmedAt || null,
    paidConfirmedAt: item.paidConfirmedAt || null,
    receivedConfirmedAt: item.receivedConfirmedAt || null,
    cancelledAt: item.cancelledAt || null,
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
    meetConfirmedAt: null,
    paidConfirmedAt: null,
    receivedConfirmedAt: null,
    cancelledAt: null,
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

async function updateOrderStatusInCloud(orderId, status, userId) {
  const collection = getOrderCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const current = await getOrderFromCloud(orderId);
  if (!current) {
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
  }

  const res = await collection.doc(orderId).update({ data: patch }).catch(() => null);
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
    throw new Error("Already reviewed");
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

// --- Exported API ---

export async function createOrder(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    buyerId: userId,
    buyerName: profile.nickName || "买家"
  };

  const cloudOrder = await createOrderInCloud(fullPayload).catch(() => null);
  if (cloudOrder) {
    return cloudOrder;
  }

  const order = normalizeOrder({
    ...fullPayload,
    id: generateId("order"),
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  const list = readOrders();
  list.unshift(order);
  saveOrders(list);
  await wait();
  return order;
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
    return cloudOrder;
  }

  await wait(30);
  const order = readOrders()
    .map((item) => normalizeOrder(item))
    .find((item) => item.id === orderId) || null;

  if (order && userId && order.buyerId !== userId && order.sellerId !== userId) {
    return null;
  }
  return order;
}

export async function updateOrderStatus(orderId, status) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  // 先获取订单信息以便在完成时更新商品状态
  const orderForUpdate = status === "completed" ? (await getOrder(orderId).catch(() => null)) : null;

  const cloudResult = await updateOrderStatusInCloud(orderId, status, userId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    if (cloudResult && status === "completed") {
      addPoints("complete_order", orderId).catch(() => null);
      recordOrderCompletion().catch(() => null);
      if (orderForUpdate && orderForUpdate.productId) {
        updateProductStatus(orderForUpdate.productId, "sold").catch(() => null);
      }
    }
    return cloudResult;
  }

  const list = readOrders();
  const idx = list.findIndex((item) => item.id === orderId);
  if (idx < 0) {
    return false;
  }

  const current = normalizeOrder(list[idx]);
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
  }

  list.splice(idx, 1, { ...current, ...patch });
  saveOrders(list);

  if (status === "completed") {
    addPoints("complete_order", orderId).catch(() => null);
    recordOrderCompletion().catch(() => null);
    if (current.productId) {
      updateProductStatus(current.productId, "sold").catch(() => null);
    }
  }

  await wait();
  return true;
}

export async function submitReview(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
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
    return cloudReview;
  }

  // 本地去重：同一用户不能对同一订单重复评价
  const existing = readReviews();
  const alreadyReviewed = existing.some(
    (r) => r.orderId === fullPayload.orderId && r.fromUserId === fullPayload.fromUserId
  );
  if (alreadyReviewed) {
    throw new Error("Already reviewed");
  }

  const review = normalizeReview({
    ...fullPayload,
    id: generateId("review"),
    createdAt: Date.now()
  });
  existing.push(review);
  saveReviews(existing);
  addPoints("submit_review", review.id).catch(() => null);
  await wait();
  return review;
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
