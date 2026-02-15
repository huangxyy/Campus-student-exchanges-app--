import { mockProducts } from "@/utils/mock-products";
import { getCloudDatabase, isCloudReady } from "@/utils/cloud";
import { generateId as generateUniqueId, getCurrentUserId, createRateLimiter } from "@/utils/common";
import { sanitizeText, sanitizeNumber } from "@/utils/sanitize";

const publishLimiter = createRateLimiter(3000);

const CUSTOM_PRODUCT_KEY = "cm_custom_products";
const CLOUD_PRODUCT_FOLDER = "products";

function isCloudDatabaseReady() {
  return !!getCloudDatabase();
}

function toNumberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function deriveCoordinateFromLocation(locationText = "") {
  const text = String(locationText || "");
  const presets = [
    { keyword: "图书馆", latitude: 30.5402, longitude: 114.3601 },
    { keyword: "教学楼", latitude: 30.5414, longitude: 114.3616 },
    { keyword: "宿舍", latitude: 30.5387, longitude: 114.3589 },
    { keyword: "食堂", latitude: 30.5393, longitude: 114.3625 },
    { keyword: "操场", latitude: 30.5377, longitude: 114.3632 },
    { keyword: "快递站", latitude: 30.5421, longitude: 114.3591 },
    { keyword: "体育馆", latitude: 30.5379, longitude: 114.3628 },
    { keyword: "公交站", latitude: 30.543, longitude: 114.3645 },
    { keyword: "艺术楼", latitude: 30.5408, longitude: 114.3652 }
  ];

  const target = presets.find((item) => text.includes(item.keyword));
  return target || null;
}

function getProductCoordinate(item = {}) {
  const latitude = toNumberOrNull(item.latitude ?? item.locationLatitude);
  const longitude = toNumberOrNull(item.longitude ?? item.locationLongitude);
  if (typeof latitude === "number" && typeof longitude === "number") {
    return { latitude, longitude };
  }

  return deriveCoordinateFromLocation(item.location);
}

function calcDistanceKm(from, to) {
  if (!from || !to) {
    return null;
  }

  const rad = Math.PI / 180;
  const lat1 = from.latitude * rad;
  const lat2 = to.latitude * rad;
  const dLat = lat2 - lat1;
  const dLng = (to.longitude - from.longitude) * rad;

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function normalizeQueryFilters(filters = {}) {
  const rawMin = Number(filters.priceMin);
  const rawMax = Number(filters.priceMax);
  const rawNearby = Number(filters.nearbyDistanceKm);
  const priceMin = Number.isFinite(rawMin) && rawMin >= 0 ? rawMin : null;
  const priceMax = Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : null;
  const nearbyDistanceKm = Number.isFinite(rawNearby) && rawNearby > 0 ? rawNearby : 1;
  const anchorLatitude = toNumberOrNull(filters.anchorLatitude);
  const anchorLongitude = toNumberOrNull(filters.anchorLongitude);
  const hasAnchor = typeof anchorLatitude === "number" && typeof anchorLongitude === "number";

  return {
    priceMin,
    priceMax,
    conditions: Array.isArray(filters.conditions) ? filters.conditions.filter(Boolean) : [],
    locations: Array.isArray(filters.locations) ? filters.locations.filter(Boolean) : [],
    nearbyEnabled: !!filters.nearbyEnabled && hasAnchor,
    nearbyDistanceKm,
    anchor: hasAnchor
      ? {
          latitude: anchorLatitude,
          longitude: anchorLongitude
        }
      : null
  };
}

function applyAdvancedFilters(list = [], filters = {}) {
  const { priceMin, priceMax, conditions, locations, nearbyEnabled, nearbyDistanceKm, anchor } = normalizeQueryFilters(filters);

  const result = [];

  list.forEach((item) => {
    const price = Number(item.price || 0);
    if (typeof priceMin === "number" && price < priceMin) {
      return;
    }
    if (typeof priceMax === "number" && price > priceMax) {
      return;
    }

    if (conditions.length > 0 && !conditions.includes(item.condition)) {
      return;
    }

    if (locations.length > 0) {
      const locationText = String(item.location || "");
      const matched = locations.some((keyword) => locationText.includes(keyword));
      if (!matched) {
        return;
      }
    }

    let distanceKm = null;
    if (anchor) {
      const coord = getProductCoordinate(item);
      distanceKm = coord ? calcDistanceKm(anchor, coord) : null;
    }

    if (nearbyEnabled) {
      if (typeof distanceKm !== "number") {
        return;
      }
      if (distanceKm > nearbyDistanceKm) {
        return;
      }
    }

    if (typeof distanceKm === "number") {
      result.push({
        ...item,
        _distanceKm: distanceKm
      });
      return;
    }

    result.push(item);
  });

  return result;
}

function applyKeywordFilter(list = [], keyword = "") {
  const q = String(keyword || "").trim().toLowerCase();
  if (!q) {
    return list;
  }

  return list.filter((item) => {
    const title = String(item.title || "").toLowerCase();
    const desc = String(item.description || "").toLowerCase();
    return title.includes(q) || desc.includes(q);
  });
}

async function queryProductsFromCloud(params = {}) {
  const {
    keyword = "",
    category = "all",
    sortBy = "time",
    page = 1,
    pageSize = 10,
    filters = {}
  } = params;

  const db = getCloudDatabase();
  if (!db) {
    throw new Error("Cloud database is unavailable");
  }
  const where = {
    status: "available"
  };

  if (category !== "all") {
    where.category = category;
  }

  let orderBy = "createdAt";
  let orderDirection = "desc";

  if (sortBy === "price") {
    orderBy = "price";
    orderDirection = "asc";
  }

  if (sortBy === "views") {
    orderBy = "views";
    orderDirection = "desc";
  }

  if (sortBy === "distance") {
    orderBy = "createdAt";
    orderDirection = "desc";
  }

  // 微信云数据库单次查询最大 limit 为 100
  const res = await db
    .collection("products")
    .where(where)
    .orderBy(orderBy, orderDirection)
    .limit(100)
    .get();

  const keywordFiltered = applyKeywordFilter(res.data || [], keyword);
  const filtered = applyAdvancedFilters(keywordFiltered, filters);
  const sorted = sortList(filtered, sortBy);
  const total = sorted.length;
  const skip = (page - 1) * pageSize;
  const list = sorted.slice(skip, skip + pageSize);

  return {
    list,
    total,
    noMore: skip + list.length >= total
  };
}

async function getProductByIdFromCloud(id) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error("Cloud database is unavailable");
  }
  const res = await db.collection("products").doc(id).get();
  return res.data || null;
}

function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortList(list, sortBy) {
  const cloned = [...list];
  if (sortBy === "distance") {
    cloned.sort((a, b) => {
      const da = typeof a._distanceKm === "number" ? a._distanceKm : 999999;
      const db = typeof b._distanceKm === "number" ? b._distanceKm : 999999;
      if (da === db) {
        return Number(b.createdAt || 0) - Number(a.createdAt || 0);
      }
      return da - db;
    });
    return cloned;
  }
  if (sortBy === "price") {
    cloned.sort((a, b) => a.price - b.price);
    return cloned;
  }
  if (sortBy === "views") {
    cloned.sort((a, b) => b.views - a.views);
    return cloned;
  }
  cloned.sort((a, b) => b.createdAt - a.createdAt);
  return cloned;
}

function readCustomProducts() {
  try {
    return uni.getStorageSync(CUSTOM_PRODUCT_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveCustomProducts(list) {
  uni.setStorageSync(CUSTOM_PRODUCT_KEY, list);
}

function getAllProducts() {
  const customProducts = readCustomProducts();
  return [...customProducts, ...mockProducts];
}

function updateCustomProductInStorage(productId, updater) {
  const customProducts = readCustomProducts();
  const targetIndex = customProducts.findIndex((item) => item._id === productId);
  if (targetIndex < 0) {
    return null;
  }

  const current = customProducts[targetIndex];
  const next = updater(current);
  customProducts.splice(targetIndex, 1, next);
  saveCustomProducts(customProducts);
  return next;
}

function removeCustomProductInStorage(productId) {
  const customProducts = readCustomProducts();
  const next = customProducts.filter((item) => item._id !== productId);
  if (next.length === customProducts.length) {
    return false;
  }
  saveCustomProducts(next);
  return true;
}

function buildCloudPath(filePath) {
  const extMatch = /\.[a-zA-Z0-9]+$/.exec(filePath || "");
  const ext = extMatch ? extMatch[0] : ".jpg";
  return `${CLOUD_PRODUCT_FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

async function uploadImageToCloud(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "";
  }

  if (filePath.startsWith("cloud://") || filePath.startsWith("https://") || filePath.startsWith("http://")) {
    return filePath;
  }

  if (!isCloudReady() || typeof wx.cloud.uploadFile !== "function") {
    return filePath;
  }

  const uploadRes = await wx.cloud.uploadFile({
    cloudPath: buildCloudPath(filePath),
    filePath
  });

  return uploadRes.fileID || filePath;
}

async function uploadImagesToCloud(images = []) {
  const uploadTasks = images.map((filePath) => uploadImageToCloud(filePath));
  return Promise.all(uploadTasks);
}

async function publishProductToCloud(payload) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error("Cloud database is unavailable");
  }

  const uploadedImages = await uploadImagesToCloud(payload.images || []);
  const draft = createProductDraft(
    {
      ...payload,
      images: uploadedImages
    },
    {
      generateId: false
    }
  );

  const { _id, ...dataToSave } = draft;
  const addRes = await db.collection("products").add({
    data: dataToSave
  });

  return {
    ...draft,
    _id: addRes._id || _id
  };
}

export async function queryProducts(params = {}) {
  if (isCloudDatabaseReady()) {
    const cloudResult = await queryProductsFromCloud(params).catch(() => null);
    if (cloudResult) {
      return cloudResult;
    }
  }

  const {
    keyword = "",
    category = "all",
    sortBy = "time",
    page = 1,
    pageSize = 10,
    filters = {}
  } = params;

  let list = getAllProducts().filter((item) => item.status === "available");

  if (category !== "all") {
    list = list.filter((item) => item.category === category);
  }

  list = applyKeywordFilter(list, keyword);

  list = applyAdvancedFilters(list, filters);

  const sorted = sortList(list, sortBy);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const sliced = sorted.slice(start, end);

  await delay();

  return {
    list: sliced,
    total: sorted.length,
    noMore: end >= sorted.length
  };
}

export async function getProductById(id) {
  if (isCloudDatabaseReady()) {
    const cloudProduct = await getProductByIdFromCloud(id).catch(() => null);
    if (cloudProduct) {
      return cloudProduct;
    }
  }

  await delay(120);
  return getAllProducts().find((item) => item._id === id) || null;
}

export function createProductDraft(payload, options = {}) {
  const { generateId = true } = options;
  const id = generateId ? generateUniqueId("prod") : "";
  const now = Date.now();
  const latitude = toNumberOrNull(payload.latitude ?? payload.locationLatitude);
  const longitude = toNumberOrNull(payload.longitude ?? payload.locationLongitude);
  return {
    _id: id,
    title: sanitizeText(payload.title, { maxLength: 40 }),
    description: sanitizeText(payload.description, { maxLength: 300 }),
    price: sanitizeNumber(payload.price, 0.01, 99999),
    originalPrice: sanitizeNumber(payload.originalPrice, 0, 99999),
    category: payload.category,
    condition: payload.condition || "9成新",
    images: payload.images || [],
    location: sanitizeText(payload.location || "校内自提", { maxLength: 30 }),
    tags: (payload.tags || []).map((t) => sanitizeText(t, { maxLength: 20 })),
    latitude,
    longitude,
    locationAddress: sanitizeText(payload.locationAddress || "", { maxLength: 60 }),
    collegeTag: sanitizeText(payload.collegeTag || "", { maxLength: 20 }),
    certified: !!payload.certified,
    status: "available",
    views: 0,
    favorites: 0,
    userId: payload.userId,
    userName: payload.userName,
    userAvatar: payload.userAvatar,
    aiGenerated: !!payload.aiGenerated,
    createdAt: now,
    updatedAt: now
  };
}

export async function publishProduct(payload) {
  if (!publishLimiter.check("publish")) {
    throw new Error("操作过于频繁，请稍后再试");
  }

  if (isCloudDatabaseReady()) {
    const cloudDraft = await publishProductToCloud(payload).catch(() => null);
    if (cloudDraft) {
      return cloudDraft;
    }
  }

  const localDraft = createProductDraft(payload);
  const customProducts = readCustomProducts();
  customProducts.unshift(localDraft);
  saveCustomProducts(customProducts);
  await delay(100);
  return localDraft;
}

async function queryProductsByUserFromCloud(userId, { page = 1, pageSize = 10 } = {}) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error("Cloud database is unavailable");
  }

  const countRes = await db.collection("products").where({ userId }).count();
  const total = countRes.total || 0;

  const skip = (page - 1) * pageSize;
  const res = await db
    .collection("products")
    .where({ userId })
    .orderBy("createdAt", "desc")
    .skip(skip)
    .limit(pageSize)
    .get();

  const list = res.data || [];
  return { list, total, noMore: skip + list.length >= total };
}

export async function queryProductsByUser(userId, options = {}) {
  const { page = 1, pageSize = 10 } = options;

  if (!userId) {
    return { list: [], total: 0, noMore: true };
  }

  if (isCloudDatabaseReady()) {
    const cloudResult = await queryProductsByUserFromCloud(userId, { page, pageSize }).catch(() => null);
    if (cloudResult) {
      return cloudResult;
    }
  }

  await delay(100);
  const all = getAllProducts()
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const total = all.length;
  const start = (page - 1) * pageSize;
  const list = all.slice(start, start + pageSize);
  return { list, total, noMore: start + list.length >= total };
}

async function updateProductStatusInCloud(productId, status) {
  const db = getCloudDatabase();
  if (!db) {
    throw new Error("Cloud database is unavailable");
  }

  await db.collection("products").doc(productId).update({
    data: {
      status,
      updatedAt: Date.now()
    }
  });

  return true;
}

export async function updateProductStatus(productId, status) {
  if (!productId || !status) {
    return false;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  // 本地所有权校验
  const product = getAllProducts().find((p) => p._id === productId);
  if (product && product.userId && product.userId !== userId) {
    console.warn("[ProductService] updateProductStatus: permission denied");
    return false;
  }

  if (isCloudDatabaseReady()) {
    const cloudUpdated = await updateProductStatusInCloud(productId, status).catch(() => false);
    if (cloudUpdated) {
      return true;
    }
  }

  const updated = updateCustomProductInStorage(productId, (current) => ({
    ...current,
    status,
    updatedAt: Date.now()
  }));
  await delay(80);
  return !!updated;
}

export async function deleteProduct(productId) {
  if (!productId) {
    return false;
  }

  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  // 本地所有权校验
  const product = getAllProducts().find((p) => p._id === productId);
  if (product && product.userId && product.userId !== userId) {
    console.warn("[ProductService] deleteProduct: permission denied");
    return false;
  }

  if (isCloudDatabaseReady()) {
    const db = getCloudDatabase();
    if (db) {
      const cloudDeleted = await db
        .collection("products")
        .doc(productId)
        .remove()
        .then(() => true)
        .catch(() => false);
      if (cloudDeleted) {
        return true;
      }
    }
  }

  const localDeleted = removeCustomProductInStorage(productId);
  await delay(80);
  return localDeleted;
}

export async function increaseProductViews(productId) {
  if (!productId) {
    return;
  }

  // 优先云端更新，成功则不再更新本地，避免双重递增
  if (isCloudDatabaseReady()) {
    const db = getCloudDatabase();
    if (db) {
      const _ = db.command;
      const cloudOk = await db
        .collection("products")
        .doc(productId)
        .update({
          data: {
            views: _.inc(1),
            updatedAt: Date.now()
          }
        })
        .then(() => true)
        .catch(() => false);
      if (cloudOk) {
        return;
      }
    }
  }

  // 云端失败时才更新本地
  const localUpdated = updateCustomProductInStorage(productId, (current) => ({
    ...current,
    views: Number(current.views || 0) + 1,
    updatedAt: Date.now()
  }));

  if (!localUpdated) {
    const mockItem = mockProducts.find((item) => item._id === productId);
    if (mockItem) {
      mockItem.views = Number(mockItem.views || 0) + 1;
    }
  }
}
