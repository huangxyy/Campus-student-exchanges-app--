import { getCurrentProfile, getCurrentUserId, wait, generateId, createThrottledStorage } from "@/utils/common";
import { getCloudDatabase } from "@/utils/cloud";
import { sanitizeText } from "@/utils/sanitize";
import { safeCloudCall } from "@/utils/cloud-call";

const throttledStorage = createThrottledStorage(200);

const CONVERSATIONS_KEY = "cm_conversations";
const MESSAGE_KEY_PREFIX = "cm_messages_";

function logCloudFallback(action, error) {
  console.warn(`[ChatService] ${action}: cloud failed, fallback to local`, error);
}

function getConversationsStorageKey(userId) {
  return `${CONVERSATIONS_KEY}_${userId || "guest"}`;
}

function getMessageStorageKey(userId, conversationId) {
  return `${MESSAGE_KEY_PREFIX}${userId || "guest"}_${conversationId}`;
}

function readConversations(userId) {
  try {
    return uni.getStorageSync(getConversationsStorageKey(userId)) || [];
  } catch (error) {
    return [];
  }
}

function saveConversations(userId, list) {
  uni.setStorageSync(getConversationsStorageKey(userId), list);
}

function readMessages(userId, conversationId) {
  try {
    return uni.getStorageSync(getMessageStorageKey(userId, conversationId)) || [];
  } catch (error) {
    return [];
  }
}

function saveMessages(userId, conversationId, list) {
  throttledStorage.save(getMessageStorageKey(userId, conversationId), list);
}

function getConversationCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("conversations");
}

function getMessageCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("messages");
}

function normalizeConversation(item = {}, currentUserId = "") {
  const unreadMap = item.unreadMap || item.unreadCount || {};
  const topMap = item.topMap || {};
  const participants = item.participants || [];
  const participantsMeta = item.participantsMeta || {};
  const derivedPeerId = participants.find((id) => id && id !== currentUserId) || "";
  const peerId = item.peerId || derivedPeerId;
  const peerMeta = participantsMeta[peerId] || {};
  return {
    id: item.id || item._id || generateId("conv"),
    peerId,
    peerName: peerMeta.name || item.peerName || "校园同学",
    peerAvatar: peerMeta.avatar || item.peerAvatar || "https://picsum.photos/seed/default-peer/120/120",
    productId: item.productId || "",
    productTitle: item.productTitle || "",
    preview: item.preview || item.lastMessage?.content || "",
    unread: Number(unreadMap[currentUserId] || item.unread || 0),
    updatedAt: item.updatedAt || Date.now(),
    isTop: !!topMap[currentUserId] || !!item.isTop,
    participants,
    unreadMap,
    topMap,
    participantsMeta
  };
}

function sortConversations(list = []) {
  return [...list].sort((a, b) => {
    const topA = a?.isTop ? 1 : 0;
    const topB = b?.isTop ? 1 : 0;
    if (topA !== topB) {
      return topB - topA;
    }
    return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
  });
}

const KNOWN_MESSAGE_TYPES = new Set(["image", "system", "product_card", "task_card"]);

function normalizeMessage(item = {}, currentUserId = "") {
  let sender = "peer";
  if (item.sender === "system" || item.senderId === "system" || item.type === "system") {
    sender = "system";
  } else if (item.sender === "me" || item.senderId === currentUserId) {
    sender = "me";
  }

  const type = KNOWN_MESSAGE_TYPES.has(item.type) ? item.type : "text";
  const imageUrl = item.imageUrl || item.url || "";
  const content = item.content || (type === "image" ? "[图片]" : "");

  return {
    id: item.id || item._id || generateId("msg"),
    sender,
    type,
    content,
    imageUrl,
    cardPayload: item.cardPayload || null,
    createdAt: item.createdAt || Date.now(),
    status: item.status || "sent",
    isRead: !!item.isRead
  };
}

function getCardPreview(type) {
  if (type === "product_card") {
    return "[商品卡片]";
  }
  if (type === "task_card") {
    return "[任务卡片]";
  }
  return "[卡片]";
}

function ensureSeedConversation(userId) {
  const existing = readConversations(userId);
  if (existing.length > 0) {
    return;
  }

  const id = generateId("conv");
  const now = Date.now();
  const seededConversation = {
    id,
    peerId: "seed-user-001",
    peerName: "李同学",
    peerAvatar: "https://picsum.photos/seed/chat-u1/120/120",
    productId: "prod-1002",
    productTitle: "95新无线鼠标，静音按键",
    preview: "鼠标还在，今晚可以面交。",
    unread: 1,
    updatedAt: now - 1000 * 60 * 12,
    participants: [userId, "seed-user-001"]
  };

  saveConversations(userId, [seededConversation]);
  saveMessages(userId, id, [
    {
      id: `msg-${now - 1000 * 60 * 20}`,
      sender: "me",
      content: "你好，鼠标还在吗？",
      createdAt: now - 1000 * 60 * 20
    },
    {
      id: `msg-${now - 1000 * 60 * 12}`,
      sender: "peer",
      content: "还在的，可以今晚面交。",
      createdAt: now - 1000 * 60 * 12
    }
  ]);
}

async function listConversationsFromCloud(currentUserId) {
  const conversationCollection = getConversationCollection();
  if (!conversationCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await conversationCollection
    .where({
      participants: _.in([currentUserId])
    })
    .orderBy("updatedAt", "desc")
    .limit(100)
    .get();

  return (res.data || []).map((item) => normalizeConversation(item, currentUserId));
}

async function getConversationFromCloud(currentUserId, conversationId) {
  const conversationCollection = getConversationCollection();
  if (!conversationCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await conversationCollection.doc(conversationId).get().catch(() => null);
  const raw = res?.data;
  if (!raw) {
    return null;
  }

  const participants = raw.participants || [];
  if (!participants.includes(currentUserId)) {
    return null;
  }

  return normalizeConversation(raw, currentUserId);
}

function normalizeMessageQueryOptions(options = {}) {
  const rawLimit = Number(options.limit);
  const rawAfter = Number(options.afterCreatedAt);
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, Math.floor(rawLimit))) : 200;
  const afterCreatedAt = Number.isFinite(rawAfter) && rawAfter > 0 ? rawAfter : 0;
  return {
    limit,
    afterCreatedAt
  };
}

async function getMessagesFromCloud(currentUserId, conversationId, options = {}) {
  const messageCollection = getMessageCollection();
  if (!messageCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const { limit, afterCreatedAt } = normalizeMessageQueryOptions(options);
  const db = getCloudDatabase();
  const _ = db?.command;
  const where = { conversationId };
  if (afterCreatedAt > 0 && _) {
    where.createdAt = _.gt(afterCreatedAt);
  }

  const res = await messageCollection
    .where(where)
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();

  return (res.data || []).map((item) => normalizeMessage(item, currentUserId));
}

function buildUnreadMap(participants = [], base = {}) {
  const unreadMap = { ...base };
  participants.forEach((id) => {
    if (typeof unreadMap[id] !== "number") {
      unreadMap[id] = 0;
    }
  });
  return unreadMap;
}

function incrementUnreadForOthers(participants, currentUnreadMap, senderId) {
  const unreadMap = buildUnreadMap(participants, { ...currentUnreadMap });
  participants
    .filter((id) => id !== senderId)
    .forEach((id) => {
      unreadMap[id] = Number(unreadMap[id] || 0) + 1;
    });
  unreadMap[senderId] = 0;
  return unreadMap;
}

async function updateConversationAfterSend(conversationCollection, conversationId, { preview, unreadMap, senderId, now }) {
  await conversationCollection.doc(conversationId).update({
    data: {
      preview,
      unreadMap,
      updatedAt: now,
      lastMessage: { content: preview, senderId, createdAt: now }
    }
  });
}

function saveLocalMessageAndUpdateConversation(userId, conversationId, message) {
  const messages = readMessages(userId, conversationId);
  messages.push(message);
  saveMessages(userId, conversationId, messages);

  const conversations = readConversations(userId);
  const idx = conversations.findIndex((item) => item.id === conversationId);
  if (idx >= 0) {
    conversations.splice(idx, 1, {
      ...conversations[idx],
      preview: message.content,
      updatedAt: message.createdAt
    });
    saveConversations(userId, conversations);
  }
}

function buildConsultationText(topicType, topicTitle) {
  if (topicType === "task") {
    return {
      preview: `咨询了任务：${topicTitle}`,
      system: `已发起任务咨询：${topicTitle}`
    };
  }

  return {
    preview: `咨询了商品：${topicTitle}`,
    system: `已发起咨询：${topicTitle}`
  };
}

async function createOrGetConversationByProductFromCloud(currentUserId, payload) {
  const conversationCollection = getConversationCollection();
  const messageCollection = getMessageCollection();
  if (!conversationCollection || !messageCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const { productId, productTitle, peerId, peerName, peerAvatar, topicType = "product" } = payload;
  const consultationText = buildConsultationText(topicType, productTitle);
  const db = getCloudDatabase();
  const _ = db.command;

  const existingRes = await conversationCollection
    .where({
      productId,
      participants: _.all([currentUserId, peerId])
    })
    .limit(1)
    .get();
  const existing = existingRes.data && existingRes.data[0];
  if (existing) {
    return normalizeConversation(existing, currentUserId);
  }

  const profile = getCurrentProfile();
  const now = Date.now();
  const participants = [currentUserId, peerId];
  const unreadMap = buildUnreadMap(participants, {
    [currentUserId]: 0,
    [peerId]: 1
  });
  const data = {
    participants,
    participantsMeta: {
      [currentUserId]: {
        name: profile.nickName || "校园用户",
        avatar: profile.avatar || "https://picsum.photos/seed/default-avatar/120/120"
      },
      [peerId]: {
        name: peerName || "校园同学",
        avatar: peerAvatar || "https://picsum.photos/seed/default-peer/120/120"
      }
    },
    unreadMap,
    peerId,
    peerName: peerName || "校园同学",
    peerAvatar: peerAvatar || "https://picsum.photos/seed/default-peer/120/120",
    productId,
    productTitle,
    initiatorId: currentUserId,
    initiatorName: profile.nickName || "校园用户",
    preview: consultationText.preview,
    updatedAt: now,
    createdAt: now,
    lastMessage: {
      content: consultationText.system,
      senderId: "system",
      createdAt: now
    }
  };
  const addRes = await conversationCollection.add({ data });
  const conversationId = addRes._id;

  await messageCollection.add({
    data: {
      conversationId,
      senderId: "system",
      type: "system",
      content: consultationText.system,
      createdAt: now
    }
  });

  return normalizeConversation(
    {
      ...data,
      _id: conversationId
    },
    currentUserId
  );
}

async function markConversationReadInCloud(currentUserId, conversationId) {
  const conversationCollection = getConversationCollection();
  const messageCollection = getMessageCollection();
  if (!conversationCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const conversation = await getConversationFromCloud(currentUserId, conversationId);
  if (!conversation) {
    return false;
  }

  const unreadMap = buildUnreadMap(conversation.participants, {
    ...(conversation.unreadMap || {})
  });
  unreadMap[currentUserId] = 0;

  const res = await conversationCollection
    .doc(conversationId)
    .update({
      data: {
        unreadMap,
        updatedAt: Date.now()
      }
    })
    .catch(() => null);

  if (messageCollection) {
    const db = getCloudDatabase();
    const _ = db.command;
    await messageCollection
      .where({
        conversationId,
        senderId: _.neq(currentUserId)
      })
      .update({
        data: {
          isRead: true
        }
      })
      .catch(() => null);
  }

  return !!(res && res.stats && res.stats.updated > 0);
}

async function sendMessageToCloud(currentUserId, conversationId, { type, content, preview, imageUrl, cardPayload }) {
  const conversationCollection = getConversationCollection();
  const messageCollection = getMessageCollection();
  if (!conversationCollection || !messageCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const current = await getConversationFromCloud(currentUserId, conversationId);
  if (!current) {
    return null;
  }

  const now = Date.now();
  const messageData = { conversationId, senderId: currentUserId, type, content: preview || content, createdAt: now };
  if (imageUrl) {
    messageData.imageUrl = imageUrl;
  }
  if (cardPayload) {
    messageData.cardPayload = cardPayload;
  }
  await messageCollection.add({ data: messageData });

  const unreadMap = incrementUnreadForOthers(current.participants, current.unreadMap || {}, currentUserId);
  await updateConversationAfterSend(conversationCollection, conversationId, {
    preview: preview || content,
    unreadMap,
    senderId: currentUserId,
    now
  });

  return {
    id: generateId("msg"),
    sender: "me",
    type,
    content: preview || content,
    imageUrl: imageUrl || "",
    cardPayload: cardPayload || null,
    createdAt: now,
    status: "sent",
    isRead: false
  };
}

function sanitizeCardPayload(raw) {
  return {
    id: String(raw?.id || ""),
    title: String(raw?.title || ""),
    subtitle: String(raw?.subtitle || ""),
    priceText: String(raw?.priceText || "")
  };
}

export async function listConversations() {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const cloudList = await safeCloudCall("ChatService.listConversations", () => listConversationsFromCloud(userId), {
    fallbackValue: null,
    onError: (error) => logCloudFallback("listConversations", error)
  });
  if (cloudList) {
    return sortConversations(cloudList);
  }

  ensureSeedConversation(userId);
  await wait();
  return sortConversations(readConversations(userId));
}

export async function getConversation(conversationId) {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const cloudConversation = await safeCloudCall(
    "ChatService.getConversation",
    () => getConversationFromCloud(userId, conversationId),
    {
      fallbackValue: null,
      onError: (error) => logCloudFallback("getConversation", error)
    }
  );
  if (cloudConversation) {
    return cloudConversation;
  }

  ensureSeedConversation(userId);
  await wait(30);
  return readConversations(userId).find((item) => item.id === conversationId) || null;
}

export async function getConversationMessages(conversationId, options = {}) {
  const userId = getCurrentUserId();
  if (!userId) {
    return [];
  }

  const normalizedOptions = normalizeMessageQueryOptions(options);
  const cloudMessages = await safeCloudCall(
    "ChatService.getConversationMessages",
    () => getMessagesFromCloud(userId, conversationId, normalizedOptions),
    {
      fallbackValue: null,
      onError: (error) => logCloudFallback("getConversationMessages", error)
    }
  );
  if (cloudMessages) {
    return cloudMessages;
  }

  ensureSeedConversation(userId);
  await wait(30);
  const localMessages = readMessages(userId, conversationId).sort((a, b) => a.createdAt - b.createdAt);
  if (normalizedOptions.afterCreatedAt > 0) {
    return localMessages.filter((item) => Number(item?.createdAt || 0) > normalizedOptions.afterCreatedAt);
  }
  if (localMessages.length > normalizedOptions.limit) {
    return localMessages.slice(localMessages.length - normalizedOptions.limit);
  }
  return localMessages;
}

export function watchConversationMessages(conversationId, handlers = {}) {
  const userId = getCurrentUserId();
  if (!userId || !conversationId) {
    return null;
  }

  const messageCollection = getMessageCollection();
  if (!messageCollection) {
    return null;
  }

  const query = messageCollection.where({ conversationId }).orderBy("createdAt", "asc");
  if (!query || typeof query.watch !== "function") {
    return null;
  }

  let closed = false;
  const watcher = query.watch({
    onChange: (snapshot) => {
      if (closed) {
        return;
      }
      const list = (snapshot?.docs || []).map((item) => normalizeMessage(item, userId));
      if (typeof handlers.onChange === "function") {
        handlers.onChange(list, snapshot);
      }
    },
    onError: (error) => {
      if (closed) {
        return;
      }
      if (typeof handlers.onError === "function") {
        handlers.onError(error);
      }
    }
  });

  return {
    close() {
      closed = true;
      if (watcher && typeof watcher.close === "function") {
        watcher.close();
      }
    }
  };
}

export function watchConversations(handlers = {}) {
  const userId = getCurrentUserId();
  if (!userId) {
    return null;
  }

  const conversationCollection = getConversationCollection();
  if (!conversationCollection) {
    return null;
  }

  const db = getCloudDatabase();
  const _ = db?.command;
  if (!_) {
    return null;
  }

  const query = conversationCollection
    .where({
      participants: _.in([userId])
    })
    .orderBy("updatedAt", "desc");

  if (!query || typeof query.watch !== "function") {
    return null;
  }

  let closed = false;
  const watcher = query.watch({
    onChange: (snapshot) => {
      if (closed) {
        return;
      }
      const list = sortConversations((snapshot?.docs || []).map((item) => normalizeConversation(item, userId)));
      if (typeof handlers.onChange === "function") {
        handlers.onChange(list, snapshot);
      }
    },
    onError: (error) => {
      if (closed) {
        return;
      }
      if (typeof handlers.onError === "function") {
        handlers.onError(error);
      }
    }
  });

  return {
    close() {
      closed = true;
      if (watcher && typeof watcher.close === "function") {
        watcher.close();
      }
    }
  };
}

export async function createOrGetConversationByProduct(payload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const { productId, productTitle, peerId, peerName, peerAvatar, topicType = "product" } = payload;
  const consultationText = buildConsultationText(topicType, productTitle);
  const cloudConversation = await createOrGetConversationByProductFromCloud(userId, {
    productId,
    productTitle,
    peerId,
    peerName,
    peerAvatar,
    topicType
  }).catch(() => null);
  if (cloudConversation) {
    return cloudConversation;
  }

  const conversations = readConversations(userId);
  const existing = conversations.find((item) => item.productId === productId && item.peerId === peerId);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const conversation = {
    id: `conv-${now}`,
    peerId,
    peerName: peerName || "校园同学",
    peerAvatar: peerAvatar || "https://picsum.photos/seed/default-peer/120/120",
    productId,
    productTitle,
    preview: consultationText.preview,
    unread: 0,
    updatedAt: now,
    participants: [userId, peerId]
  };

  conversations.unshift(conversation);
  saveConversations(userId, conversations);

  saveMessages(userId, conversation.id, [
    {
      id: generateId("msg"),
      sender: "system",
      content: consultationText.system,
      createdAt: now
    }
  ]);

  return conversation;
}

export async function createOrGetConversationByTask(payload) {
  const { taskId, taskTitle, peerId, peerName, peerAvatar } = payload;
  return createOrGetConversationByProduct({
    productId: `task:${taskId}`,
    productTitle: taskTitle,
    peerId,
    peerName,
    peerAvatar,
    topicType: "task"
  });
}

async function getTaskConversationMetaFromCloud(currentUserId, taskId, peerId) {
  const conversationCollection = getConversationCollection();
  if (!conversationCollection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const topicId = `task:${taskId}`;
  const res = await conversationCollection
    .where({
      productId: topicId,
      participants: _.all([currentUserId, peerId])
    })
    .limit(1)
    .get();

  const target = res.data && res.data[0];
  if (!target) {
    return {
      hasContacted: false,
      conversationId: "",
      lastContactAt: null
    };
  }

  const normalized = normalizeConversation(target, currentUserId);
  return {
    hasContacted: true,
    conversationId: normalized.id,
    lastContactAt: normalized.updatedAt || null
  };
}

function getTaskConversationMetaFromLocal(currentUserId, taskId, peerId) {
  const topicId = `task:${taskId}`;
  const conversations = readConversations(currentUserId);
  const target = conversations
    .filter((item) => item.productId === topicId && item.peerId === peerId)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];

  if (!target) {
    return {
      hasContacted: false,
      conversationId: "",
      lastContactAt: null
    };
  }

  return {
    hasContacted: true,
    conversationId: target.id,
    lastContactAt: target.updatedAt || null
  };
}

export async function getTaskConversationMeta(taskId, peerId) {
  const userId = getCurrentUserId();
  if (!userId || !taskId || !peerId) {
    return {
      hasContacted: false,
      conversationId: "",
      lastContactAt: null
    };
  }

  const cloudMeta = await getTaskConversationMetaFromCloud(userId, taskId, peerId).catch(() => null);
  if (cloudMeta) {
    return cloudMeta;
  }

  await wait(20);
  return getTaskConversationMetaFromLocal(userId, taskId, peerId);
}

export async function markConversationRead(conversationId) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const cloudMarked = await markConversationReadInCloud(userId, conversationId).catch(() => null);
  if (typeof cloudMarked === "boolean") {
    return cloudMarked;
  }

  const conversations = readConversations(userId);
  const targetIndex = conversations.findIndex((item) => item.id === conversationId);
  if (targetIndex < 0) {
    return false;
  }

  const current = conversations[targetIndex];
  conversations.splice(targetIndex, 1, {
    ...current,
    unread: 0
  });
  saveConversations(userId, conversations);

  const localMessages = readMessages(userId, conversationId);
  if (localMessages.length > 0) {
    const nextMessages = localMessages.map((item) => {
      if (!item || item.sender === "me" || item.sender === "system") {
        return item;
      }
      return {
        ...item,
        isRead: true
      };
    });
    saveMessages(userId, conversationId, nextMessages);
  }

  await wait(20);
  return true;
}

export async function sendTextMessage(conversationId, content) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const safeContent = sanitizeText(content, { maxLength: 2000 });
  const cloudMessage = await safeCloudCall(
    "ChatService.sendTextMessage",
    () => sendMessageToCloud(userId, conversationId, { type: "text", content: safeContent }),
    {
      fallbackValue: null,
      onError: (error) => logCloudFallback("sendTextMessage", error)
    }
  );
  if (cloudMessage) {
    await wait(20);
    return cloudMessage;
  }

  const message = {
    id: generateId("msg"),
    sender: "me",
    type: "text",
    content: safeContent,
    imageUrl: "",
    createdAt: Date.now(),
    status: "sent",
    isRead: false
  };
  saveLocalMessageAndUpdateConversation(userId, conversationId, message);
  await wait(20);
  return message;
}

async function sendCardMessage(conversationId, type, cardPayload) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const safePayload = sanitizeCardPayload(cardPayload);
  if (!safePayload.id || !safePayload.title) {
    throw new Error("Card payload is invalid");
  }

  const preview = getCardPreview(type);
  const cloudMessage = await safeCloudCall(
    "ChatService.sendCardMessage",
    () => sendMessageToCloud(userId, conversationId, {
      type,
      content: preview,
      preview,
      cardPayload: safePayload
    }),
    {
      fallbackValue: null,
      onError: (error) => logCloudFallback("sendCardMessage", error)
    }
  );
  if (cloudMessage) {
    await wait(20);
    return cloudMessage;
  }

  const message = {
    id: generateId("msg"),
    sender: "me",
    type,
    content: preview,
    imageUrl: "",
    cardPayload: safePayload,
    createdAt: Date.now(),
    status: "sent",
    isRead: false
  };
  saveLocalMessageAndUpdateConversation(userId, conversationId, message);
  await wait(20);
  return message;
}

export async function sendProductCardMessage(conversationId, cardPayload) {
  return sendCardMessage(conversationId, "product_card", cardPayload);
}

export async function sendTaskCardMessage(conversationId, cardPayload) {
  return sendCardMessage(conversationId, "task_card", cardPayload);
}

export async function setConversationTop(conversationId, isTop) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const conversationCollection = getConversationCollection();
  if (conversationCollection) {
    const current = await getConversationFromCloud(userId, conversationId).catch(() => null);
    if (current) {
      const nextTopMap = {
        ...(current.topMap || {}),
        [userId]: !!isTop
      };
      const cloudUpdated = await conversationCollection
        .doc(conversationId)
        .update({
          data: {
            topMap: nextTopMap,
            updatedAt: Date.now()
          }
        })
        .catch(() => null);
      if (cloudUpdated && cloudUpdated.stats && cloudUpdated.stats.updated > 0) {
        return true;
      }
    }
  }

  const conversations = readConversations(userId);
  const targetIndex = conversations.findIndex((item) => item.id === conversationId);
  if (targetIndex < 0) {
    return false;
  }
  const current = conversations[targetIndex];
  const nextTopMap = {
    ...(current.topMap || {}),
    [userId]: !!isTop
  };
  conversations.splice(targetIndex, 1, {
    ...current,
    isTop: !!isTop,
    topMap: nextTopMap,
    updatedAt: Date.now()
  });
  saveConversations(userId, conversations);
  await wait(20);
  return true;
}

export async function deleteConversation(conversationId) {
  const userId = getCurrentUserId();
  if (!userId) {
    return false;
  }

  const conversationCollection = getConversationCollection();
  const messageCollection = getMessageCollection();
  if (conversationCollection && messageCollection) {
    const current = await getConversationFromCloud(userId, conversationId).catch(() => null);
    if (current) {
      await messageCollection.where({ conversationId }).remove().catch(() => null);
      const cloudRemoved = await conversationCollection.doc(conversationId).remove().catch(() => null);
      if (cloudRemoved && cloudRemoved.stats && cloudRemoved.stats.removed > 0) {
        return true;
      }
    }
  }

  const conversations = readConversations(userId);
  const nextConversations = conversations.filter((item) => item.id !== conversationId);
  if (nextConversations.length === conversations.length) {
    return false;
  }

  saveConversations(userId, nextConversations);
  saveMessages(userId, conversationId, []);
  await wait(20);
  return true;
}

export async function sendImageMessage(conversationId, imageUrl) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User is not logged in");
  }

  const safeUrl = String(imageUrl || "").trim();
  if (!safeUrl) {
    throw new Error("Image URL is required");
  }

  const preview = "[图片]";
  const cloudMessage = await safeCloudCall(
    "ChatService.sendImageMessage",
    () => sendMessageToCloud(userId, conversationId, {
      type: "image",
      content: preview,
      preview,
      imageUrl: safeUrl
    }),
    {
      fallbackValue: null,
      onError: (error) => logCloudFallback("sendImageMessage", error)
    }
  );
  if (cloudMessage) {
    await wait(20);
    return cloudMessage;
  }

  const message = {
    id: generateId("msg"),
    sender: "me",
    type: "image",
    content: preview,
    imageUrl: safeUrl,
    createdAt: Date.now(),
    status: "sent",
    isRead: false
  };
  saveLocalMessageAndUpdateConversation(userId, conversationId, message);
  await wait(20);
  return message;
}
