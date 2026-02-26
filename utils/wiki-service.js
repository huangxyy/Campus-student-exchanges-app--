import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";
import { APP_ERROR_CODES, createAppError } from "@/utils/app-errors";

const WIKI_KEY = "cm_wiki_articles";
const DEFAULT_PAGE_SIZE = 20;

let _submitLock = false;

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

function readLocal(key) {
  try { return uni.getStorageSync(key) || []; }
  catch { return []; }
}
function saveLocal(key, list) {
  try { uni.setStorageSync(key, list); }
  catch { /* noop */ }
}

function getWikiCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("wiki_articles") : null;
}

async function listArticlesFromCloud(category, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const collection = getWikiCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const where = category ? { status: "approved", category } : { status: "approved" };
  const skip = (page - 1) * pageSize;
  const res = await collection
    .where(where)
    .orderBy("createdAt", "desc")
    .skip(skip)
    .limit(pageSize)
    .get();
  return (res.data || []).map(normalizeArticle);
}

async function getArticleFromCloud(articleId) {
  const collection = getWikiCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const res = await collection.doc(articleId).get().catch(() => null);
  if (!res || !res.data) { return null; }

  const article = normalizeArticle(res.data);

  const db = getCloudDatabase();
  await collection.doc(articleId).update({
    data: { viewCount: db.command.inc(1) }
  }).catch(() => null);

  article.viewCount += 1;
  return article;
}

async function submitArticleToCloud(payload) {
  const collection = getWikiCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

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

export async function listArticles(category, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const cloudList = await listArticlesFromCloud(category, page, pageSize).catch(() => null);
  if (cloudList) { return cloudList; }

  await wait();
  let list = readLocal(WIKI_KEY).map(normalizeArticle).filter((a) => a.status === "approved");
  if (category) { list = list.filter((a) => a.category === category); }
  list.sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

export async function getArticle(articleId) {
  if (!articleId) { return null; }

  const cloudArticle = await getArticleFromCloud(articleId).catch(() => null);
  if (cloudArticle) { return cloudArticle; }

  await wait(30);
  const articles = readLocal(WIKI_KEY).map(normalizeArticle);
  const found = articles.find((a) => a.id === articleId);
  if (!found) { return null; }

  const updated = articles.map((a) =>
    a.id === articleId ? { ...a, viewCount: a.viewCount + 1 } : a
  );
  saveLocal(WIKI_KEY, updated);
  return { ...found, viewCount: found.viewCount + 1 };
}

export async function submitArticle(payload) {
  const userId = getCurrentUserId();
  if (!userId) { throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "User is not logged in"); }
  if (_submitLock) { throw createAppError(APP_ERROR_CODES.DUPLICATE_SUBMIT, "Submit in progress"); }

  _submitLock = true;
  try {
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
    if (cloudArticle) { return cloudArticle; }

    const article = normalizeArticle({
      ...fullPayload,
      id: generateId("wiki"),
      status: "pending",
      createdAt: Date.now()
    });
    const list = readLocal(WIKI_KEY);
    list.unshift(article);
    saveLocal(WIKI_KEY, list);
    await wait();
    return article;
  } finally {
    _submitLock = false;
  }
}

export async function getMySubmissions() {
  const userId = getCurrentUserId();
  if (!userId) { return []; }

  const collection = getWikiCollection();
  if (collection) {
    const res = await collection
      .where({ authorId: userId })
      .orderBy("createdAt", "desc")
      .limit(50)
      .get()
      .catch(() => null);

    if (res && res.data) {
      return res.data.map(normalizeArticle);
    }
  }

  await wait(30);
  return readLocal(WIKI_KEY)
    .map(normalizeArticle)
    .filter((a) => a.authorId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getStatusText(status) {
  const map = { pending: "待审核", approved: "已通过", rejected: "已驳回" };
  return map[status] || "未知";
}

// --- Comments ---
const WIKI_COMMENTS_KEY = "cm_wiki_comments";

function getCommentsCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("wiki_comments") : null;
}

function normalizeComment(item = {}) {
  return {
    id: item.id || item._id || generateId("wc"),
    articleId: item.articleId || "",
    userId: item.userId || "",
    userName: item.userName || "校园用户",
    content: item.content || "",
    createdAt: item.createdAt || Date.now()
  };
}

async function listCommentsFromCloud(articleId) {
  const coll = getCommentsCollection();
  if (!coll || !articleId) { return []; }
  const res = await coll
    .where({ articleId })
    .orderBy("createdAt", "asc")
    .limit(100)
    .get()
    .catch(() => null);
  return (res?.data || []).map(normalizeComment);
}

async function addCommentToCloud(articleId, userId, userName, content) {
  const coll = getCommentsCollection();
  if (!coll || !articleId) { throw new Error("Cloud database is unavailable"); }
  const now = Date.now();
  const data = { articleId, userId, userName, content, createdAt: now };
  const addRes = await coll.add({ data });
  return normalizeComment({ ...data, _id: addRes._id });
}

export async function listComments(articleId) {
  const cloudList = await listCommentsFromCloud(articleId).catch(() => []);
  if (cloudList.length > 0) { return cloudList; }
  const key = WIKI_COMMENTS_KEY + "_" + (articleId || "");
  const raw = readLocal(key);
  return (raw || []).map(normalizeComment).sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(articleId, content) {
  const userId = getCurrentUserId();
  if (!userId) { throw createAppError(APP_ERROR_CODES.AUTH_REQUIRED, "请先登录"); }
  const profile = getCurrentProfile();
  const text = sanitizeText(content, { maxLength: 500 });
  if (!text) { throw createAppError(APP_ERROR_CODES.INVALID_PARAM, "请输入评论内容"); }

  const cloudComment = await addCommentToCloud(articleId, userId, profile.nickName || "校园用户", text).catch(() => null);
  if (cloudComment) { return cloudComment; }

  const comment = normalizeComment({
    articleId,
    userId,
    userName: profile.nickName || "校园用户",
    content: text,
    createdAt: Date.now()
  });
  const key = WIKI_COMMENTS_KEY + "_" + articleId;
  const list = readLocal(key);
  list.push(comment);
  saveLocal(key, list);
  await wait();
  return comment;
}
