import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";

const WIKI_KEY = "cm_wiki_articles";

function normalizeArticle(item = {}) {
  return {
    id: item.id || item._id || generateId("wiki"),
    title: item.title || "",
    summary: item.summary || "",
    content: item.content || "",
    category: item.category || "其他",
    authorId: item.authorId || "",
    authorName: item.authorName || "校园用户",
    status: item.status || "pending",
    viewCount: Number(item.viewCount || 0),
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  };
}

function readArticles() {
  try {
    return uni.getStorageSync(WIKI_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveArticles(list) {
  uni.setStorageSync(WIKI_KEY, list);
}

function getWikiCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("wiki_articles") : null;
}

async function listArticlesFromCloud(category) {
  const collection = getWikiCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const query = category
    ? collection.where({ status: "approved", category })
    : collection.where({ status: "approved" });

  const res = await query.orderBy("createdAt", "desc").limit(100).get();
  return (res.data || []).map((item) => normalizeArticle(item));
}

async function getArticleFromCloud(articleId) {
  const collection = getWikiCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(articleId).get().catch(() => null);
  if (!res || !res.data) {
    return null;
  }

  const db = getCloudDatabase();
  const _ = db.command;
  await collection.doc(articleId).update({
    data: { viewCount: _.inc(1) }
  }).catch(() => null);

  return normalizeArticle(res.data);
}

async function submitArticleToCloud(payload) {
  const collection = getWikiCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const now = Date.now();
  const data = {
    title: payload.title,
    summary: payload.summary || "",
    content: payload.content,
    category: payload.category || "其他",
    authorId: payload.authorId,
    authorName: payload.authorName || "校园用户",
    status: "pending",
    viewCount: 0,
    createdAt: now,
    updatedAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeArticle({ ...data, _id: addRes._id });
}

// --- Exported API ---

export async function listArticles(category) {
  const cloudList = await listArticlesFromCloud(category).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  let list = readArticles().map((item) => normalizeArticle(item)).filter((item) => item.status === "approved");
  if (category) {
    list = list.filter((item) => item.category === category);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getArticle(articleId) {
  if (!articleId) {
    return null;
  }

  const cloudArticle = await getArticleFromCloud(articleId).catch(() => null);
  if (cloudArticle) {
    return cloudArticle;
  }

  await wait(30);
  const articles = readArticles().map((item) => normalizeArticle(item));
  const found = articles.find((item) => item.id === articleId);
  if (found) {
    found.viewCount += 1;
    saveArticles(articles);
  }
  return found || null;
}

export async function submitArticle(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    title: sanitizeText(payload.title, { maxLength: 60 }),
    content: sanitizeText(payload.content, { maxLength: 5000 }),
    summary: sanitizeText(payload.summary || "", { maxLength: 200 }),
  };

  const cloudArticle = await submitArticleToCloud(fullPayload).catch(() => null);
  if (cloudArticle) {
    return cloudArticle;
  }

  const article = normalizeArticle({
    ...fullPayload,
    id: generateId("wiki"),
    status: "pending",
    createdAt: Date.now()
  });
  const list = readArticles();
  list.unshift(article);
  saveArticles(list);
  await wait();
  return article;
}

export async function getMySubmissions() {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const collection = getWikiCollection();
  if (collection) {
    const res = await collection
      .where({ authorId: userId })
      .orderBy("createdAt", "desc")
      .limit(50)
      .get()
      .catch(() => null);

    if (res && res.data) {
      return res.data.map((item) => normalizeArticle(item));
    }
  }

  await wait(30);
  return readArticles()
    .map((item) => normalizeArticle(item))
    .filter((item) => item.authorId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getStatusText(status) {
  const map = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已驳回"
  };
  return map[status] || "未知";
}
