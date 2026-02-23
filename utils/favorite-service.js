import { getCurrentUserId, wait } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";

const FAVORITES_KEY = "cm_favorites";
const _toggleLocks = new Set();

function getUserFavoritesKey(userId) {
  return `${FAVORITES_KEY}_${userId || "guest"}`;
}

function readFavorites(userId) {
  try {
    return uni.getStorageSync(getUserFavoritesKey(userId)) || [];
  } catch (error) {
    return [];
  }
}

function saveFavorites(userId, list) {
  uni.setStorageSync(getUserFavoritesKey(userId), list);
}

function getFavoriteCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("favorites");
}

function buildSnapshot(product) {
  const now = Date.now();
  return {
    _id: product._id,
    title: product.title || "",
    description: product.description || "",
    price: Number(product.price || 0),
    originalPrice: Number(product.originalPrice || 0),
    category: product.category || "other",
    condition: product.condition || "",
    images: product.images || [],
    location: product.location || "",
    status: product.status || "available",
    views: Number(product.views || 0),
    userId: product.userId || "",
    userName: product.userName || "校园用户",
    userAvatar: product.userAvatar || "https://picsum.photos/seed/default-avatar/120/120",
    aiGenerated: !!product.aiGenerated,
    createdAt: product.createdAt || now,
    updatedAt: product.updatedAt || now,
    favoritedAt: now
  };
}

function normalizeFavoriteRecord(item = {}) {
  if (item.productSnapshot) {
    const snapshot = item.productSnapshot;
    return {
      ...snapshot,
      _id: item.productId || snapshot._id,
      favoritedAt: item.favoritedAt || snapshot.favoritedAt || Date.now()
    };
  }
  return {
    ...item,
    favoritedAt: item.favoritedAt || Date.now()
  };
}

async function isProductFavoritedInCloud(userId, productId) {
  const collection = getFavoriteCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const countRes = await collection.where({ userId, productId }).count();
  return Number(countRes.total || 0) > 0;
}

async function toggleFavoriteInCloud(userId, product) {
  const collection = getFavoriteCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const existingRes = await collection.where({ userId, productId: product._id }).limit(1).get();
  const existing = existingRes.data && existingRes.data[0];

  if (existing && existing._id) {
    await collection.doc(existing._id).remove();
    return {
      favorited: false
    };
  }

  const snapshot = buildSnapshot(product);
  await collection.add({
    data: {
      userId,
      productId: snapshot._id,
      productSnapshot: snapshot,
      favoritedAt: snapshot.favoritedAt,
      updatedAt: Date.now()
    }
  });

  return {
    favorited: true
  };
}

async function listFavoritesFromCloud(userId) {
  const collection = getFavoriteCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.where({ userId }).orderBy("favoritedAt", "desc").limit(200).get();
  return (res.data || []).map((item) => normalizeFavoriteRecord(item));
}

async function removeFavoriteFromCloud(userId, productId) {
  const collection = getFavoriteCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const targetRes = await collection.where({ userId, productId }).limit(1).get();
  const target = targetRes.data && targetRes.data[0];
  if (!target || !target._id) {
    return false;
  }

  const removeRes = await collection.doc(target._id).remove().catch(() => null);
  return !!(removeRes && removeRes.stats && removeRes.stats.removed > 0);
}

export async function isProductFavorited(productId) {
  if (!productId) {
    return false;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const cloudFavorited = await isProductFavoritedInCloud(userId, productId).catch(() => null);
  if (typeof cloudFavorited === "boolean") {
    return cloudFavorited;
  }

  await wait(20);
  return readFavorites(userId).some((item) => item._id === productId);
}

export async function toggleFavorite(product) {
  if (!product || !product._id) {
    return { favorited: false };
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return { favorited: false };
  }

  const lockKey = `${userId}:${product._id}`;
  if (_toggleLocks.has(lockKey)) {
    return { favorited: readFavorites(userId).some((item) => item._id === product._id) };
  }

  _toggleLocks.add(lockKey);
  try {
    const cloudResult = await toggleFavoriteInCloud(userId, product).catch(() => null);
    if (cloudResult) {
      return cloudResult;
    }

    const list = readFavorites(userId);
    const targetIndex = list.findIndex((item) => item._id === product._id);
    if (targetIndex >= 0) {
      list.splice(targetIndex, 1);
      saveFavorites(userId, list);
      await wait();
      return { favorited: false };
    }

    list.unshift(buildSnapshot(product));
    saveFavorites(userId, list);
    await wait();
    return { favorited: true };
  } finally {
    _toggleLocks.delete(lockKey);
  }
}

export async function listFavorites() {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cloudList = await listFavoritesFromCloud(userId).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  return readFavorites(userId).sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
}

export async function removeFavorite(productId) {
  if (!productId) {
    return false;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const cloudRemoved = await removeFavoriteFromCloud(userId, productId).catch(() => null);
  if (typeof cloudRemoved === "boolean") {
    return cloudRemoved;
  }

  const list = readFavorites(userId);
  const next = list.filter((item) => item._id !== productId);
  if (next.length === list.length) {
    return false;
  }

  saveFavorites(userId, next);
  await wait();
  return true;
}
