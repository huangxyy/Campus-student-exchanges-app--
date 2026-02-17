import { getCurrentProfile, getCurrentUserId, wait, generateId } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";

const FEEDS_KEY = "cm_feeds";
const COMMENTS_KEY = "cm_feed_comments";

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

function readFeeds() {
  try {
    return uni.getStorageSync(FEEDS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveFeeds(list) {
  uni.setStorageSync(FEEDS_KEY, list);
}

function readComments() {
  try {
    return uni.getStorageSync(COMMENTS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveComments(list) {
  uni.setStorageSync(COMMENTS_KEY, list);
}

function getFeedCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feeds") : null;
}

function getCommentCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feed_comments") : null;
}

// --- Cloud operations ---

async function listFeedsFromCloud(topic) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const query = topic
    ? collection.where({ status: "active", topic })
    : collection.where({ status: "active" });

  const res = await query.orderBy("createdAt", "desc").limit(100).get();
  return (res.data || []).map((item) => normalizeFeed(item));
}

async function publishFeedToCloud(payload) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

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
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection.doc(feedId).get().catch(() => null);
  if (!res || !res.data) {
    return null;
  }

  const feed = normalizeFeed(res.data);
  const isLiked = feed.likedBy.includes(userId);

  if (isLiked) {
    await collection.doc(feedId).update({
      data: {
        likedBy: _.pull(userId),
        likeCount: _.inc(-1),
        updatedAt: Date.now()
      }
    });
    return false;
  }

  await collection.doc(feedId).update({
    data: {
      likedBy: _.push(userId),
      likeCount: _.inc(1),
      updatedAt: Date.now()
    }
  });
  return true;
}

async function deleteFeedInCloud(feedId) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(feedId).update({
    data: { status: "deleted", updatedAt: Date.now() }
  }).catch(() => null);
  return !!(res && res.stats && res.stats.updated > 0);
}

async function listCommentsFromCloud(feedId) {
  const collection = getCommentCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection
    .where({ feedId })
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();
  return (res.data || []).map((item) => normalizeComment(item));
}

async function addCommentToCloud(payload) {
  const collection = getCommentCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

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
    const _ = db.command;
    await feedCollection.doc(payload.feedId).update({
      data: { commentCount: _.inc(1), updatedAt: now }
    }).catch(() => null);
  }

  return normalizeComment({ ...data, _id: addRes._id });
}

async function getFeedByIdFromCloud(feedId) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(feedId).get().catch(() => null);
  return res && res.data ? normalizeFeed(res.data) : null;
}

// --- Exported API ---

export async function listFeeds(topic) {
  const cloudList = await listFeedsFromCloud(topic).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  let list = readFeeds().map((item) => normalizeFeed(item)).filter((item) => item.status === "active");
  if (topic) {
    list = list.filter((item) => item.topic === topic);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getFeedById(feedId) {
  if (!feedId) {
    return null;
  }

  const cloudFeed = await getFeedByIdFromCloud(feedId).catch(() => null);
  if (cloudFeed) {
    return cloudFeed;
  }

  await wait(30);
  return readFeeds().map((item) => normalizeFeed(item)).find((item) => item.id === feedId) || null;
}

export async function publishFeed(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    authorAvatar: profile.avatar || ""
  };

  fullPayload.content = sanitizeText(fullPayload.content, { maxLength: 500 });

  const cloudFeed = await publishFeedToCloud(fullPayload).catch(() => null);
  if (cloudFeed) {
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
  await wait();
  return feed;
}

export async function toggleLike(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) {
    return null;
  }

  const cloudResult = await toggleLikeInCloud(feedId, userId).catch(() => null);
  if (cloudResult !== null) {
    return cloudResult;
  }

  const list = readFeeds().map((item) => normalizeFeed(item));
  const idx = list.findIndex((item) => item.id === feedId);
  if (idx < 0) {
    return null;
  }

  const feed = list[idx];
  const isLiked = feed.likedBy.includes(userId);
  if (isLiked) {
    feed.likedBy = feed.likedBy.filter((id) => id !== userId);
    feed.likeCount = Math.max(0, feed.likeCount - 1);
  } else {
    feed.likedBy.push(userId);
    feed.likeCount += 1;
  }
  feed.updatedAt = Date.now();
  list.splice(idx, 1, feed);
  saveFeeds(list);
  return !isLiked;
}

export async function deleteFeed(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) {
    return false;
  }

  const cloudResult = await deleteFeedInCloud(feedId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    return cloudResult;
  }

  const list = readFeeds().map((item) => normalizeFeed(item));
  const idx = list.findIndex((item) => item.id === feedId && item.authorId === userId);
  if (idx < 0) {
    return false;
  }
  list.splice(idx, 1, { ...list[idx], status: "deleted", updatedAt: Date.now() });
  saveFeeds(list);
  return true;
}

export async function listComments(feedId) {
  if (!feedId) {
    return [];
  }

  const cloudComments = await listCommentsFromCloud(feedId).catch(() => null);
  if (cloudComments) {
    return cloudComments;
  }

  await wait(30);
  return readComments()
    .map((item) => normalizeComment(item))
    .filter((item) => item.feedId === feedId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    authorAvatar: profile.avatar || ""
  };

  fullPayload.content = sanitizeText(fullPayload.content, { maxLength: 500 });

  const cloudComment = await addCommentToCloud(fullPayload).catch(() => null);
  if (cloudComment) {
    return cloudComment;
  }

  const comment = normalizeComment({
    ...fullPayload,
    id: generateId("comment"),
    createdAt: Date.now()
  });
  const comments = readComments();
  comments.push(comment);
  saveComments(comments);

  const feeds = readFeeds().map((item) => normalizeFeed(item));
  const feedIdx = feeds.findIndex((item) => item.id === payload.feedId);
  if (feedIdx >= 0) {
    feeds[feedIdx].commentCount += 1;
    feeds[feedIdx].updatedAt = Date.now();
    saveFeeds(feeds);
  }

  await wait();
  return comment;
}
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";

const FEEDS_KEY = "cm_feeds";
const COMMENTS_KEY = "cm_feed_comments";

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

function readFeeds() {
  try {
    return uni.getStorageSync(FEEDS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveFeeds(list) {
  uni.setStorageSync(FEEDS_KEY, list);
}

function readComments() {
  try {
    return uni.getStorageSync(COMMENTS_KEY) || [];
  } catch (error) {
    return [];
  }
}

function saveComments(list) {
  uni.setStorageSync(COMMENTS_KEY, list);
}

function getFeedCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feeds") : null;
}

function getCommentCollection() {
  const db = getCloudDatabase();
  return db ? db.collection("feed_comments") : null;
}

// --- Cloud operations ---

async function listFeedsFromCloud(topic) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const query = topic
    ? collection.where({ status: "active", topic })
    : collection.where({ status: "active" });

  const res = await query.orderBy("createdAt", "desc").limit(100).get();
  return (res.data || []).map((item) => normalizeFeed(item));
}

async function publishFeedToCloud(payload) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

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
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection.doc(feedId).get().catch(() => null);
  if (!res || !res.data) {
    return null;
  }

  const feed = normalizeFeed(res.data);
  const isLiked = feed.likedBy.includes(userId);

  if (isLiked) {
    await collection.doc(feedId).update({
      data: {
        likedBy: _.pull(userId),
        likeCount: _.inc(-1),
        updatedAt: Date.now()
      }
    });
    return false;
  }

  await collection.doc(feedId).update({
    data: {
      likedBy: _.push(userId),
      likeCount: _.inc(1),
      updatedAt: Date.now()
    }
  });
  return true;
}

async function deleteFeedInCloud(feedId, userId) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(feedId).get().catch(() => null);
  if (!res || !res.data) {
    return false;
  }

  if (res.data.authorId && res.data.authorId !== userId) {
    console.warn("[FeedService] deleteFeedInCloud: permission denied");
    return false;
  }

  const updateRes = await collection.doc(feedId).update({
    data: { status: "deleted", updatedAt: Date.now() }
  }).catch(() => null);
  return !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);
}

async function listCommentsFromCloud(feedId) {
  const collection = getCommentCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection
    .where({ feedId })
    .orderBy("createdAt", "asc")
    .limit(200)
    .get();
  return (res.data || []).map((item) => normalizeComment(item));
}

async function addCommentToCloud(payload) {
  const collection = getCommentCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

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
    const _ = db.command;
    await feedCollection.doc(payload.feedId).update({
      data: { commentCount: _.inc(1), updatedAt: now }
    }).catch(() => null);
  }

  return normalizeComment({ ...data, _id: addRes._id });
}

async function getFeedByIdFromCloud(feedId) {
  const collection = getFeedCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(feedId).get().catch(() => null);
  return res && res.data ? normalizeFeed(res.data) : null;
}

// --- Exported API ---

export async function listFeeds(topic) {
  const cloudList = await listFeedsFromCloud(topic).catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  await wait();
  let list = readFeeds().map((item) => normalizeFeed(item)).filter((item) => item.status === "active");
  if (topic) {
    list = list.filter((item) => item.topic === topic);
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getFeedById(feedId) {
  if (!feedId) {
    return null;
  }

  const cloudFeed = await getFeedByIdFromCloud(feedId).catch(() => null);
  if (cloudFeed) {
    return cloudFeed;
  }

  await wait(30);
  return readFeeds().map((item) => normalizeFeed(item)).find((item) => item.id === feedId) || null;
}

export async function publishFeed(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    authorAvatar: profile.avatar || ""
  };

  fullPayload.content = sanitizeText(fullPayload.content, { maxLength: 500 });

  const cloudFeed = await publishFeedToCloud(fullPayload).catch(() => null);
  if (cloudFeed) {
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
  await wait();
  return feed;
}

export async function toggleLike(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) {
    return null;
  }

  const cloudResult = await toggleLikeInCloud(feedId, userId).catch(() => null);
  if (cloudResult !== null) {
    return cloudResult;
  }

  const list = readFeeds().map((item) => normalizeFeed(item));
  const idx = list.findIndex((item) => item.id === feedId);
  if (idx < 0) {
    return null;
  }

  const feed = list[idx];
  const isLiked = feed.likedBy.includes(userId);
  if (isLiked) {
    feed.likedBy = feed.likedBy.filter((id) => id !== userId);
    feed.likeCount = Math.max(0, feed.likeCount - 1);
  } else {
    feed.likedBy.push(userId);
    feed.likeCount += 1;
  }
  feed.updatedAt = Date.now();
  list.splice(idx, 1, feed);
  saveFeeds(list);
  return !isLiked;
}

export async function deleteFeed(feedId) {
  const userId = getCurrentUserId();
  if (!userId || !feedId) {
    return false;
  }

  const cloudResult = await deleteFeedInCloud(feedId, userId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    return cloudResult;
  }

  const list = readFeeds().map((item) => normalizeFeed(item));
  const idx = list.findIndex((item) => item.id === feedId && item.authorId === userId);
  if (idx < 0) {
    return false;
  }
  list.splice(idx, 1, { ...list[idx], status: "deleted", updatedAt: Date.now() });
  saveFeeds(list);
  return true;
}

export async function listComments(feedId) {
  if (!feedId) {
    return [];
  }

  const cloudComments = await listCommentsFromCloud(feedId).catch(() => null);
  if (cloudComments) {
    return cloudComments;
  }

  await wait(30);
  return readComments()
    .map((item) => normalizeComment(item))
    .filter((item) => item.feedId === feedId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function addComment(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const profile = getCurrentProfile();
  const fullPayload = {
    ...payload,
    authorId: userId,
    authorName: profile.nickName || "校园用户",
    authorAvatar: profile.avatar || ""
  };

  fullPayload.content = sanitizeText(fullPayload.content, { maxLength: 500 });

  const cloudComment = await addCommentToCloud(fullPayload).catch(() => null);
  if (cloudComment) {
    return cloudComment;
  }

  const comment = normalizeComment({
    ...fullPayload,
    id: generateId("comment"),
    createdAt: Date.now()
  });
  const comments = readComments();
  comments.push(comment);
  saveComments(comments);

  const feeds = readFeeds().map((item) => normalizeFeed(item));
  const feedIdx = feeds.findIndex((item) => item.id === payload.feedId);
  if (feedIdx >= 0) {
    feeds[feedIdx].commentCount += 1;
    feeds[feedIdx].updatedAt = Date.now();
    saveFeeds(feeds);
  }

  await wait();
  return comment;
}
