import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";
import { addPoints } from "@/utils/points-service";

const FEEDS_KEY = "cm_feeds";
const COMMENTS_KEY = "cm_feed_comments";
const DEFAULT_PAGE_SIZE = 20;

let _publishLock = false;

function normalizeFeed(item = {}) {
  return {
    id: item.id || item._id || generateId("feed"),
    authorId: item.authorId || "",
    authorName: item.authorName || "校园用户",
    authorAvatar: item.authorAvatar || "",
    content: item.content || "",
    images: Array.isArray(item.images) ? item.images : [],
    topic: item.topic || "",
    likeCount: Number(item.likeCount || 0),
    commentCount: Number(item.commentCount || 0),
    likedBy: Array.isArray(item.likedBy) ? item.likedBy : [],
    status: item.status || "active",
    createdAt: item.createdAt || Date.now(),
    updatedAt: item.updatedAt || item.createdAt || Date.now()
  };
}

function normalizeComment(item = {}) {
  return {
    id: item.id || item._id || generateId("comment"),
    feedId: item.feedId || "",
    authorId: item.authorId || "",
    authorName: item.authorName || "校园用户",
    authorAvatar: item.authorAvatar || "",
    content: item.content || "",
    replyToCommentId: item.replyToCommentId || "",
    replyToName: item.replyToName || "",
    createdAt: item.createdAt || Date.now()
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
const readFeeds = () => readLocal(FEEDS_KEY);
const saveFeeds = (list) => saveLocal(FEEDS_KEY, list);
const readComments = () => readLocal(COMMENTS_KEY);
const saveComments = (list) => saveLocal(COMMENTS_KEY, list);

function getFeedCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feeds") : null;
}

function getCommentCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feed_comments") : null;
}

// --- Cloud operations ---

async function listFeedsFromCloud(topic, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const collection = getFeedCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const where = topic ? { status: "active", topic } : { status: "active" };
  const skip = (page - 1) * pageSize;
  const res = await collection
    .where(where)
    .orderBy("createdAt", "desc")
    .skip(skip)
    .limit(pageSize)
    .get();
  return (res.data || []).map(normalizeFeed);
}

async function publishFeedToCloud(payload) {
  const collection = getFeedCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const now = Date.now();
  const data = {
    authorId: payload.authorId,
    authorName: payload.authorName || "校园用户",
    authorAvatar: payload.authorAvatar || "",
    content: payload.content,
    images: payload.images || [],
    topic: payload.topic || "",
    likeCount: 0,
    commentCount: 0,
    likedBy: [],
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  const addRes = await collection.add({ data });
  return normalizeFeed({ ...data, _id: addRes._id });
}

async function toggleLikeInCloud(feedId, userId) {
  const collection = getFeedCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection.doc(feedId).get().catch(() => null);
  if (!res || !res.data) { return null; }

  const isLiked = (res.data.likedBy || []).includes(userId);
  const update = isLiked
    ? { likedBy: _.pull(userId), likeCount: _.inc(-1), updatedAt: Date.now() }
    : { likedBy: _.push(userId), likeCount: _.inc(1), updatedAt: Date.now() };

  await collection.doc(feedId).update({ data: update });
  return !isLiked;
}

async function deleteFeedInCloud(feedId, userId) {
  const collection = getFeedCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const res = await collection.doc(feedId).get().catch(() => null);
  if (!res || !res.data) { return false; }
  if (res.data.authorId && res.data.authorId !== userId) { return false; }

  const updateRes = await collection.doc(feedId).update({
    data: { status: "deleted", updatedAt: Date.now() }
  }).catch(() => null);
  return !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);
}

async function listCommentsFromCloud(feedId) {
  const collection = getCommentCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const res = await collection
    .where({ feedId })
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();
  return (res.data || []).map(normalizeComment);
}

async function addCommentToCloud(payload) {
  const collection = getCommentCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const now = Date.now();
  const data = {
    feedId: payload.feedId,
    authorId: payload.authorId,
    authorName: payload.authorName || "校园用户",
    authorAvatar: payload.authorAvatar || "",
    content: payload.content,
    replyToCommentId: payload.replyToCommentId || "",
    replyToName: payload.replyToName || "",
    createdAt: now
  };

  const addRes = await collection.add({ data });

  const feedCollection = getFeedCollection();
  if (feedCollection) {
    const db = getCloudDatabase();
    await feedCollection.doc(payload.feedId).update({
      data: { commentCount: db.command.inc(1), updatedAt: now }
    }).catch(() => null);
  }

  return normalizeComment({ ...data, _id: addRes._id });
}

async function getFeedByIdFromCloud(feedId) {
  const collection = getFeedCollection();
  if (!collection) { throw new Error("Cloud database is unavailable"); }

  const res = await collection.doc(feedId).get().catch(() => null);
  return res && res.data ? normalizeFeed(res.data) : null;
}

// --- Exported API ---

export async function listFeeds(topic, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const cloudList = await listFeedsFromCloud(topic, page, pageSize).catch(() => null);
  if (cloudList) { return cloudList; }

  await wait();
  let list = readFeeds().map(normalizeFeed).filter((f) => f.status === "active");
  if (topic) { list = list.filter((f) => f.topic === topic); }
  list.sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

export async function getFeedById(feedId) {
  if (!feedId) { return null; }

  const cloudFeed = await getFeedByIdFromCloud(feedId).catch(() => null);
  if (cloudFeed) { return cloudFeed; }

  await wait(30);
  return readFeeds().map(normalizeFeed).find((f) => f.id === feedId) || null;
}

export async function publishFeed(payload) {
  const userId = getCurrentUserId();
  if (!userId) { throw new Error("User is not logged in"); }
  if (_publishLock) { throw new Error("Publish in progress"); }

  _publishLock = true;
  try {
    const profile = getCurrentProfile();
    const fullPayload = {
      ...payload,
      authorId: userId,
      authorName: profile.nickName || "校园用户",
      authorAvatar: profile.avatar || "",
      content: sanitizeText(payload.content, { maxLength: 500 })
    };

    const cloudFeed = await publishFeedToCloud(fullPayload).catch(() => null);
    if (cloudFeed) {
      addPoints("publish_feed", cloudFeed.id).catch(() => null);
      return cloudFeed;
    }

    const feed = normalizeFeed({
      ...fullPayload,
      id: generateId("feed"),
      status: "active",
      createdAt: Date.now()
    });
    const list = readFeeds();
    list.unshift(feed);
    saveFeeds(list);
    addPoints("publish_feed", feed.id).catch(() => null);
    await wait();
    return feed;
  } finally {
    _publishLock = false;
  }
}

export async function toggleLike(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) { return null; }

  const cloudResult = await toggleLikeInCloud(feedId, userId).catch(() => null);
  if (cloudResult !== null) { return cloudResult; }

  const list = readFeeds().map(normalizeFeed);
  const idx = list.findIndex((f) => f.id === feedId);
  if (idx < 0) { return null; }

  const feed = { ...list[idx] };
  const isLiked = feed.likedBy.includes(userId);
  feed.likedBy = isLiked
    ? feed.likedBy.filter((id) => id !== userId)
    : [...feed.likedBy, userId];
  feed.likeCount = Math.max(0, feed.likeCount + (isLiked ? -1 : 1));
  feed.updatedAt = Date.now();
  list[idx] = feed;
  saveFeeds(list);
  return !isLiked;
}

export async function deleteFeed(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) { return false; }

  const cloudResult = await deleteFeedInCloud(feedId, userId).catch(() => null);
  if (typeof cloudResult === "boolean") { return cloudResult; }

  const list = readFeeds().map(normalizeFeed);
  const idx = list.findIndex((f) => f.id === feedId && f.authorId === userId);
  if (idx < 0) { return false; }
  list[idx] = { ...list[idx], status: "deleted", updatedAt: Date.now() };
  saveFeeds(list);
  return true;
}

export async function listComments(feedId) {
  if (!feedId) { return []; }

  const cloudComments = await listCommentsFromCloud(feedId).catch(() => null);
  if (cloudComments) { return cloudComments; }

  await wait(30);
  return readComments()
    .map(normalizeComment)
    .filter((c) => c.feedId === feedId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(payload) {
  const userId = getCurrentUserId();
  if (!userId) { throw new Error("User is not logged in"); }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    authorAvatar: profile.avatar || "",
    content: sanitizeText(payload.content, { maxLength: 500 })
  };

  const cloudComment = await addCommentToCloud(fullPayload).catch(() => null);
  if (cloudComment) { return cloudComment; }

  const comment = normalizeComment({
    ...fullPayload,
    id: generateId("comment"),
    createdAt: Date.now()
  });
  const comments = readComments();
  comments.push(comment);
  saveComments(comments);

  const feeds = readFeeds().map(normalizeFeed);
  const feedIdx = feeds.findIndex((f) => f.id === payload.feedId);
  if (feedIdx >= 0) {
    feeds[feedIdx] = { ...feeds[feedIdx], commentCount: feeds[feedIdx].commentCount + 1, updatedAt: Date.now() };
    saveFeeds(feeds);
  }

  await wait();
  return comment;
}
