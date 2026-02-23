import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";

const WANTS_KEY = "cm_wants";
const SUBSCRIPTIONS_KEY = "cm_want_subscriptions";

function normalizeWant(item = {}) {
  return {
    id: item.id || item._id || generateId("want"),
    title: item.title || "",
    description: item.description || "",
    category: item.category || "其他",
    priceMin: Number(item.priceMin || 0),
    priceMax: Number(item.priceMax || 0),
    validUntil: item.validUntil || null,
    status: item.status || "active",
    publisherId: item.publisherId || "",
    publisherName: item.publisherName || "校园用户",
    matchCount: Number(item.matchCount || 0),
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  };
}

function normalizeSubscription(item = {}) {
  return {
    id: item.id || item._id || generateId("sub"),
    userId: item.userId || "",
    categories: Array.isArray(item.categories) ? item.categories : [],
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    enabled: item.enabled !== false,
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || Date.now()
  };
}

function readWants() {
  try {
    return uni.getStorageSync(WANTS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveWants(list) {
  uni.setStorageSync(WANTS_KEY, list);
}

function readSubscription(userId) {
  try {
    const all = uni.getStorageSync(SUBSCRIPTIONS_KEY) || [];
    return all.find((item) => item.userId === userId) || null;
  } catch (error) {
    return null;
  }
}

function saveSubscription(userId, sub) {
  try {
    const all = uni.getStorageSync(SUBSCRIPTIONS_KEY) || [];
    const idx = all.findIndex((item) => item.userId === userId);
    if (idx >= 0) {
      all.splice(idx, 1, sub);
    } else {
      all.push(sub);
    }
    uni.setStorageSync(SUBSCRIPTIONS_KEY, all);
  } catch (error) {
    // ignore
  }
}

function getWantCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("wants");
}

function getSubscriptionCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("want_subscriptions");
}

function isWantExpired(want) {
  if (!want.validUntil) {
    return false;
  }
  return Date.now() > Number(want.validUntil);
}

// --- Cloud operations ---

async function listWantsFromCloud() {
  const collection = getWantCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection
    .where({ status: "active" })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return (res.data || []).map((item) => normalizeWant(item));
}

async function publishWantToCloud(payload) {
  const collection = getWantCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const now = Date.now();
  const data = {
    title: payload.title,
    description: payload.description || "",
    category: payload.category || "其他",
    priceMin: Number(payload.priceMin || 0),
    priceMax: Number(payload.priceMax || 0),
    validUntil: payload.validUntil || null,
    status: "active",
    publisherId: payload.publisherId,
    publisherName: payload.publisherName || "校园用户",
    matchCount: 0,
    createdAt: now,
    updatedAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeWant({ ...data, _id: addRes._id });
}

async function getMyWantsFromCloud(userId) {
  const collection = getWantCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection
    .where({ publisherId: userId })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return (res.data || []).map((item) => normalizeWant(item));
}

async function closeWantInCloud(wantId, userId) {
  const collection = getWantCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(wantId).get().catch(() => null);
  if (!res || !res.data) {
    return false;
  }

  if (res.data.publisherId && res.data.publisherId !== userId) {
    console.warn("[WantService] closeWantInCloud: permission denied");
    return false;
  }

  const updateRes = await collection.doc(wantId).update({
    data: { status: "closed", updatedAt: Date.now() }
  }).catch(() => null);

  return !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);
}

async function getSubscriptionFromCloud(userId) {
  const collection = getSubscriptionCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.where({ userId }).limit(1).get();
  const raw = res.data && res.data[0];
  return raw ? normalizeSubscription(raw) : null;
}

async function saveSubscriptionToCloud(userId, sub) {
  const collection = getSubscriptionCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const existing = await getSubscriptionFromCloud(userId).catch(() => null);
  const now = Date.now();

  if (existing && existing.id) {
    await collection.doc(existing.id).update({
      data: {
        categories: sub.categories || [],
        keywords: sub.keywords || [],
        enabled: sub.enabled !== false,
        updatedAt: now
      }
    });
    return normalizeSubscription({ ...existing, ...sub, updatedAt: now });
  }

  const data = {
    userId,
    categories: sub.categories || [],
    keywords: sub.keywords || [],
    enabled: sub.enabled !== false,
    createdAt: now,
    updatedAt: now
  };
  const addRes = await collection.add({ data });
  return normalizeSubscription({ ...data, _id: addRes._id });
}

async function matchWantsForProduct(product) {
  const collection = getWantCollection();
  if (!collection) {
    return [];
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection
    .where({ status: "active" })
    .orderBy("createdAt", "desc")
    .limit(200)
    .get()
    .catch(() => null);

  if (!res || !res.data) {
    return [];
  }

  const wants = res.data.map((item) => normalizeWant(item));
  const productTitle = String(product.title || "").toLowerCase();
  const productCategory = String(product.category || "");
  const productPrice = Number(product.price || 0);

  return wants.filter((want) => {
    if (isWantExpired(want)) {
      return false;
    }
    const titleMatch = want.title && productTitle.includes(String(want.title).toLowerCase());
    const categoryMatch = want.category && want.category === productCategory;
    const priceInRange = (!want.priceMax || productPrice <= want.priceMax) &&
      (!want.priceMin || productPrice >= want.priceMin);
    return (titleMatch || categoryMatch) && priceInRange;
  });
}

// --- Exported API ---

export async function listWants() {
  const cloudList = await listWantsFromCloud().catch(() => null);
  if (cloudList) {
    return cloudList.filter((item) => !isWantExpired(item));
  }

  await wait();
  return readWants()
    .map((item) => normalizeWant(item))
    .filter((item) => item.status === "active" && !isWantExpired(item))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function publishWant(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    publisherId: userId,
    publisherName: profile.nickName || "校园用户"
  };

  fullPayload.title = sanitizeText(fullPayload.title, { maxLength: 40 });
  fullPayload.description = sanitizeText(fullPayload.description, { maxLength: 200 });

  const cloudWant = await publishWantToCloud(fullPayload).catch(() => null);
  if (cloudWant) {
    return cloudWant;
  }

  const want = normalizeWant({
    ...fullPayload,
    id: generateId("want"),
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  const list = readWants();
  list.unshift(want);
  saveWants(list);
  await wait();
  return want;
}

export async function getMyWants() {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cloudList = await getMyWantsFromCloud(userId).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  return readWants()
    .map((item) => normalizeWant(item))
    .filter((item) => item.publisherId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function closeWant(wantId) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const cloudResult = await closeWantInCloud(wantId, userId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    return cloudResult;
  }

  const list = readWants();
  const idx = list.findIndex((item) => item.id === wantId);
  if (idx < 0) {
    return false;
  }
  list.splice(idx, 1, { ...list[idx], status: "closed", updatedAt: Date.now() });
  saveWants(list);
  await wait();
  return true;
}

export async function getSubscription() {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const cloudSub = await getSubscriptionFromCloud(userId).catch(() => null);
  if (cloudSub) {
    return cloudSub;
  }

  await wait(30);
  return readSubscription(userId);
}

export async function updateSubscription(sub) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const cloudSub = await saveSubscriptionToCloud(userId, sub).catch(() => null);
  if (cloudSub) {
    return cloudSub;
  }

  const normalized = normalizeSubscription({
    ...sub,
    userId,
    updatedAt: Date.now()
  });
  saveSubscription(userId, normalized);
  await wait();
  return normalized;
}

export async function findMatchingWants(product) {
  if (!product || !product.title) {
    return [];
  }

  const cloudMatches = await matchWantsForProduct(product).catch(() => []);
  if (cloudMatches.length > 0) {
    return cloudMatches;
  }

  const localWants = readWants()
    .map((item) => normalizeWant(item))
    .filter((item) => item.status === "active" && !isWantExpired(item));

  const productTitle = String(product.title || "").toLowerCase();
  const productCategory = String(product.category || "");
  const productPrice = Number(product.price || 0);

  return localWants.filter((want) => {
    const titleMatch = want.title && productTitle.includes(String(want.title).toLowerCase());
    const categoryMatch = want.category && want.category === productCategory;
    const priceInRange = (!want.priceMax || productPrice <= want.priceMax) &&
      (!want.priceMin || productPrice >= want.priceMin);
    return (titleMatch || categoryMatch) && priceInRange;
  });
}
