const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

function isWantExpired(want) {
  if (!want.validUntil) return false;
  return Date.now() > Number(want.validUntil);
}

function wantMatchesProduct(want, product) {
  const productTitle = String(product.title || "").toLowerCase();
  const productCategory = String(product.category || "");
  const productPrice = Number(product.price || 0);
  const wantTitle = String(want.title || "").toLowerCase();
  const titleMatch = wantTitle && productTitle.includes(wantTitle);
  const categoryMatch = want.category && want.category === productCategory;
  const priceInRange =
    (!want.priceMax || productPrice <= want.priceMax) &&
    (!want.priceMin || productPrice >= want.priceMin);
  return (titleMatch || categoryMatch) && priceInRange;
}

function subscriptionAcceptsProduct(sub, product) {
  if (!sub || sub.enabled === false) return false;
  const categories = Array.isArray(sub.categories) ? sub.categories : [];
  const keywords = Array.isArray(sub.keywords) ? sub.keywords : [];
  const catOk = categories.length === 0 || categories.includes(product.category);
  const title = String(product.title || "").toLowerCase();
  const keywordOk =
    keywords.length === 0 || keywords.some((k) => title.includes(String(k).trim().toLowerCase()));
  return catOk || keywordOk;
}

exports.main = async (event) => {
  const productId = event && event.productId;
  if (!productId) {
    return { code: -1, message: "missing productId" };
  }

  let product = null;
  try {
    const res = await db.collection("products").doc(productId).get();
    product = res.data;
  } catch (e) {
    return { code: -2, message: "product not found" };
  }
  if (!product) {
    return { code: -2, message: "product not found" };
  }

  let wants = [];
  try {
    const wantRes = await db
      .collection("wants")
      .where({ status: "active" })
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    wants = (wantRes.data || []).filter((w) => !isWantExpired(w));
  } catch (e) {
    return { code: -3, message: "wants query failed" };
  }

  const matched = wants.filter((w) => wantMatchesProduct(w, product));
  const now = Date.now();
  const alertData = {
    productId: product._id,
    productTitle: product.title || "",
    productCategory: product.category || "",
    productPrice: Number(product.price || 0),
    createdAt: now,
    read: false
  };
  let added = 0;

  for (const want of matched) {
    const userId = want.publisherId;
    if (!userId) continue;
    let sub = null;
    try {
      const subRes = await db.collection("want_subscriptions").where({ userId }).limit(1).get();
      sub = subRes.data && subRes.data[0];
    } catch (e) {
      continue;
    }
    if (!subscriptionAcceptsProduct(sub, product)) continue;
    try {
      await db.collection("arrival_alerts").add({
        data: { userId, ...alertData }
      });
      added += 1;
    } catch (e) {
      // skip duplicate or permission
    }
  }

  return { code: 0, message: "ok", matched: matched.length, added };
};
