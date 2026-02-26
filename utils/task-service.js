import { getCloudDatabase } from "@/utils/cloud";

import { generateId } from "@/utils/common";
import { sanitizeText } from "@/utils/sanitize";
import { addPoints } from "@/utils/points-service";
import { recordTaskCompletion } from "@/utils/trust-service";
import { logAuditEvent } from "@/utils/audit-service";
import { assertActionBurstLimit, assertActionRateLimit, assertTextLength } from "@/utils/risk-service";

const TASK_KEY = "cm_tasks";

const defaultTasks = [
  {
    id: "task-seed-1",
    title: "代取快递（南门菜鸟）",
    type: "代取快递",
    reward: 6,
    time: "今天 17:30 前",
    location: "南区宿舍楼下",
    publisher: "王同学",
    publisherId: "seed-user-001",
    status: "open",
    assignedUser: "",
    assignedUserId: "",
    deadlineAt: Date.now() + 1000 * 60 * 80,
    distanceKm: 0.6,
    requirements: ["守时"],
    createdAt: Date.now() - 1000 * 60 * 30
  },
  {
    id: "task-seed-2",
    title: "代开组会，签个到",
    type: "代会",
    reward: 20,
    time: "明天 09:00",
    location: "教三 203",
    publisher: "张同学",
    publisherId: "seed-user-002",
    status: "open",
    assignedUser: "",
    assignedUserId: "",
    deadlineAt: Date.now() + 1000 * 60 * 60 * 9,
    distanceKm: 1.8,
    requirements: ["会做会议记录"],
    createdAt: Date.now() - 1000 * 60 * 80
  },
  {
    id: "task-seed-3",
    title: "代课点名（微观经济学）",
    type: "代课",
    reward: 30,
    time: "周三 10:00",
    location: "经管楼 B210",
    publisher: "刘同学",
    publisherId: "seed-user-003",
    status: "open",
    assignedUser: "",
    assignedUserId: "",
    deadlineAt: Date.now() + 1000 * 60 * 60 * 30,
    distanceKm: 2.4,
    requirements: ["认真听课"],
    createdAt: Date.now() - 1000 * 60 * 180
  }
];

function normalizeTask(task = {}) {
  const normalizedType = task.type === "代取" ? "代取快递" : task.type;
  return {
    id: task.id || task._id || generateId("task"),
    title: task.title || "",
    type: normalizedType || "其他",
    reward: Number(task.reward || 0),
    time: task.time || "",
    location: task.location || "",
    description: task.description || "",
    publisher: task.publisher || "校园用户",
    publisherId: task.publisherId || "",
    status: task.status || "open", // open/assigned/picked_up/delivered/completed/cancelled
    assignedUser: task.assignedUser || "",
    assignedUserId: task.assignedUserId || "",
    deadlineAt: task.deadlineAt || null,
    distanceKm: typeof task.distanceKm === "number" ? task.distanceKm : null,
    requirements: Array.isArray(task.requirements) ? task.requirements : [],
    isRecurring: !!task.isRecurring,
    recurringRule: task.recurringRule || "",
    assignedAt: task.assignedAt || null,
    pickedUpAt: task.pickedUpAt || null,
    deliveredAt: task.deliveredAt || null,
    completedAt: task.completedAt || null,
    cancelledAt: task.cancelledAt || null,
    confirmProofImage: task.confirmProofImage || "",
    confirmByAssigneeAt: task.confirmByAssigneeAt || null,
    confirmByPublisherAt: task.confirmByPublisherAt || null,
    createdAt: task.createdAt || Date.now(),
    updatedAt: task.updatedAt || task.createdAt || Date.now()
  };
}

function wait(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readTasks() {
  try {
    const raw = uni.getStorageSync(TASK_KEY) || [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((item) => normalizeTask(item));
  } catch (error) {
    return [];
  }
}

function saveTasks(list) {
  uni.setStorageSync(TASK_KEY, list);
}

function ensureTasks() {
  const list = readTasks();
  if (list.length > 0) {
    return;
  }
  saveTasks(defaultTasks);
}

function getTaskCollection() {
  const db = getCloudDatabase();
  if (!db) {
    return null;
  }
  return db.collection("tasks");
}

function isExpressType(task) {
  const type = task?.type === "代取" ? "代取快递" : task?.type;
  return type === "代取快递";
}

function isTaskStatusTransitionAllowed(current, next) {
  if (current === "open") {
    return ["assigned", "cancelled"].includes(next);
  }
  if (current === "assigned") {
    return ["picked_up", "delivered", "completed", "confirm_complete", "cancelled"].includes(next);
  }
  if (current === "picked_up") {
    return ["delivered", "cancelled"].includes(next);
  }
  if (current === "delivered") {
    return ["completed"].includes(next);
  }
  return false;
}

function canOperateTask(task, operatorUserId, nextStatus) {
  if (!task || !operatorUserId) {
    return false;
  }

  if (nextStatus === "cancelled") {
    return task.publisherId === operatorUserId;
  }

  if (nextStatus === "picked_up" || nextStatus === "delivered") {
    return task.assignedUserId === operatorUserId;
  }

  if (nextStatus === "confirm_complete") {
    return task.publisherId === operatorUserId || task.assignedUserId === operatorUserId;
  }

  if (nextStatus === "completed") {
    if (isExpressType(task)) {
      return task.publisherId === operatorUserId;
    }
    return task.publisherId === operatorUserId || task.assignedUserId === operatorUserId;
  }

  return false;
}

function buildTaskUserStats(publishedList = [], acceptedList = []) {
  const publishedCount = publishedList.length;
  const publishedCompletedCount = publishedList.filter((item) => item.status === "completed").length;
  const acceptedCount = acceptedList.length;
  const acceptedCompletedCount = acceptedList.filter((item) => item.status === "completed").length;

  const creditBase = publishedCompletedCount + acceptedCompletedCount;
  const creditStars = Math.min(5, Math.max(3, 3 + Math.floor(creditBase / 5)));
  const goodRate = acceptedCount > 0 ? Math.round((acceptedCompletedCount / acceptedCount) * 100) : 100;

  let helperTag = "新手帮手";
  if (acceptedCompletedCount >= 10) {
    helperTag = "靠谱帮手";
  } else if (acceptedCompletedCount >= 3) {
    helperTag = "热心帮手";
  }

  return {
    publishedCount,
    publishedCompletedCount,
    acceptedCount,
    acceptedCompletedCount,
    goodRate,
    creditStars,
    helperTag
  };
}

async function getTaskUserStatsFromCloud(userId) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const [publishedRes, acceptedRes] = await Promise.all([
    collection.where({ publisherId: userId }).limit(200).get(),
    collection.where({ assignedUserId: userId }).limit(200).get()
  ]);

  return buildTaskUserStats(
    (publishedRes.data || []).map((item) => normalizeTask(item)),
    (acceptedRes.data || []).map((item) => normalizeTask(item))
  );
}

function getTaskUserStatsFromLocal(userId) {
  const list = readTasks();
  return buildTaskUserStats(
    list.filter((item) => item.publisherId === userId),
    list.filter((item) => item.assignedUserId === userId)
  );
}

async function listTasksFromCloud() {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const db = getCloudDatabase();
  const _ = db.command;
  const res = await collection
    .where({
      status: _.in(["open", "assigned"])
    })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return (res.data || []).map((item) => normalizeTask(item));
}

async function getTaskByIdFromCloud(taskId) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const res = await collection.doc(taskId).get();
  return normalizeTask(res.data || {});
}

async function publishTaskToCloud(payload) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const now = Date.now();
  const draft = normalizeTask({
    title: payload.title,
    type: payload.type,
    reward: Number(payload.reward || 0),
    time: payload.time,
    location: payload.location,
    description: payload.description || "",
    deadlineAt: payload.deadlineAt || null,
    distanceKm: typeof payload.distanceKm === "number" ? payload.distanceKm : null,
    requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
    isRecurring: !!payload.isRecurring,
    recurringRule: payload.recurringRule || "",
    publisher: payload.publisher,
    publisherId: payload.publisherId,
    status: "open",
    assignedUser: "",
    assignedUserId: "",
    assignedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now
  });

  const { id, ...data } = draft;
  const addRes = await collection.add({ data });
  return {
    ...draft,
    id: addRes._id || id
  };
}

async function takeTaskInCloud(taskId, userName, userId) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const currentRes = await collection.doc(taskId).get().catch(() => null);
  const current = normalizeTask(currentRes?.data || {});
  if (!current.id || current.status !== "open") {
    return false;
  }

  const updateRes = await collection
    .where({
      _id: taskId,
      status: "open"
    })
    .update({
      data: {
        status: "assigned",
        assignedUser: userName,
        assignedUserId: userId || "",
        assignedAt: Date.now(),
        completedAt: null,
        cancelledAt: null,
        updatedAt: Date.now()
      }
    })
    .catch(() => null);

  return !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);
}

async function listMyTasksFromCloud(userId) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const [publishedRes, acceptedRes] = await Promise.all([
    collection.where({ publisherId: userId }).orderBy("createdAt", "desc").limit(100).get(),
    collection.where({ assignedUserId: userId }).orderBy("createdAt", "desc").limit(100).get()
  ]);

  return {
    published: (publishedRes.data || []).map((item) => normalizeTask(item)),
    accepted: (acceptedRes.data || []).map((item) => normalizeTask(item))
  };
}

async function updateTaskStatusInCloud(taskId, status, operatorUserId) {
  const collection = getTaskCollection();
  if (!collection) {
    throw new Error("Cloud database is unavailable");
  }

  const currentRes = await collection.doc(taskId).get().catch(() => null);
  const current = normalizeTask(currentRes?.data || {});
  if (!current.id) {
    return false;
  }

  if (!isTaskStatusTransitionAllowed(current.status, status)) {
    return false;
  }

  if (!canOperateTask(current, operatorUserId, status)) {
    return false;
  }

  const now = Date.now();
  const statusPatch = {
    completedAt: status === "completed" ? now : (current.completedAt || null),
    cancelledAt: status === "cancelled" ? now : (current.cancelledAt || null),
    pickedUpAt: status === "picked_up" ? now : (current.pickedUpAt || null),
    deliveredAt: status === "delivered" ? now : (current.deliveredAt || null)
  };

  const updateRes = await collection
    .where({
      _id: taskId,
      status: current.status,
      updatedAt: Number(current.updatedAt || 0)
    })
    .update({
      data: {
        status,
        ...statusPatch,
        updatedAt: now
      }
    })
    .catch(() => null);

  if (!updateRes || !updateRes.stats || updateRes.stats.updated <= 0) {
    const latestRes = await collection.doc(taskId).get().catch(() => null);
    const latest = normalizeTask(latestRes?.data || {});
    return !!(latest.id && latest.status === status);
  }

  return !!(updateRes && updateRes.stats && updateRes.stats.updated > 0);
}

export function watchOpenTasks(handlers = {}) {
  const collection = getTaskCollection();
  if (!collection) {
    return null;
  }

  const db = getCloudDatabase();
  const _ = db?.command;
  if (!_) {
    return null;
  }

  const query = collection
    .where({
      status: _.in(["open", "assigned"])
    })
    .orderBy("createdAt", "desc");

  if (!query || typeof query.watch !== "function") {
    return null;
  }

  let closed = false;
  const watcher = query.watch({
    onChange: (snapshot) => {
      if (closed) {
        return;
      }

      const list = (snapshot?.docs || []).map((item) => normalizeTask(item));
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

export async function listTasks() {
  const cloudList = await listTasksFromCloud().catch(() => null);
  if (cloudList) {
    return cloudList;
  }

  ensureTasks();
  await wait();
  return readTasks()
    .filter((item) => item.status === "open" || item.status === "assigned")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getTaskById(taskId) {
  if (!taskId) {
    return null;
  }

  const cloudTask = await getTaskByIdFromCloud(taskId).catch(() => null);
  if (cloudTask && cloudTask.id) {
    return cloudTask;
  }

  ensureTasks();
  await wait(30);
  return readTasks().find((item) => item.id === taskId) || null;
}

export async function publishTask(payload) {
  assertActionRateLimit(`task:publish:${payload?.publisherId || ""}`, {
    intervalMs: 2500,
    message: "任务发布过于频繁，请稍后再试"
  });
  assertTextLength(payload?.title || "", 40, "任务标题过长");
  assertTextLength(payload?.description || "", 300, "任务描述过长");

  const cloudTask = await publishTaskToCloud(payload).catch(() => null);
  if (cloudTask) {
    addPoints("publish_task", cloudTask.id).catch(() => null);
    return cloudTask;
  }

  ensureTasks();
  const list = readTasks();
  const task = {
    id: generateId("task"),
    title: sanitizeText(payload.title, { maxLength: 40 }),
    type: payload.type,
    reward: Number(payload.reward || 0),
    time: payload.time,
    location: sanitizeText(payload.location, { maxLength: 40 }),
    description: sanitizeText(payload.description || "", { maxLength: 300 }),
    deadlineAt: payload.deadlineAt || null,
    distanceKm: typeof payload.distanceKm === "number" ? payload.distanceKm : null,
    requirements: Array.isArray(payload.requirements) ? payload.requirements : [],
    isRecurring: !!payload.isRecurring,
    recurringRule: payload.recurringRule || "",
    publisher: payload.publisher,
    publisherId: payload.publisherId,
    status: "open",
    assignedUser: "",
    assignedUserId: "",
    assignedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  list.unshift(task);
  saveTasks(list);
  addPoints("publish_task", task.id).catch(() => null);
  await wait();
  return task;
}

export async function takeTask(taskId, userName, userId) {
  const cloudResult = await takeTaskInCloud(taskId, userName, userId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    if (cloudResult) {
      logAuditEvent("task_taken", {
        taskId,
        userId: userId || "",
        userName: userName || "",
        channel: "cloud"
      }).catch(() => null);
    }
    return cloudResult;
  }

  ensureTasks();
  const list = readTasks();
  const index = list.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return false;
  }

  const current = list[index];
  if (current.status !== "open") {
    return false;
  }

  list.splice(index, 1, {
    ...current,
    status: "assigned",
    assignedUser: userName,
    assignedUserId: userId || "",
    assignedAt: Date.now(),
    completedAt: null,
    cancelledAt: null,
    updatedAt: Date.now()
  });
  saveTasks(list);
  logAuditEvent("task_taken", {
    taskId,
    userId: userId || "",
    userName: userName || "",
    channel: "local"
  }).catch(() => null);
  await wait();
  return true;
}

export async function listMyTasks(userId) {
  if (!userId) {
    return {
      published: [],
      accepted: []
    };
  }

  const cloudResult = await listMyTasksFromCloud(userId).catch(() => null);
  if (cloudResult) {
    return cloudResult;
  }

  ensureTasks();
  await wait();
  const list = readTasks().sort((a, b) => b.createdAt - a.createdAt);
  return {
    published: list.filter((item) => item.publisherId === userId),
    accepted: list.filter((item) => item.assignedUserId === userId)
  };
}

export async function getTaskUserStats(userId) {
  if (!userId) {
    return buildTaskUserStats([], []);
  }

  const cloudStats = await getTaskUserStatsFromCloud(userId).catch(() => null);
  if (cloudStats) {
    return cloudStats;
  }

  ensureTasks();
  await wait(30);
  return getTaskUserStatsFromLocal(userId);
}

function applyDualConfirm(task, operatorUserId) {
  const now = Date.now();
  const isPublisher = task.publisherId === operatorUserId;
  const isAssignee = task.assignedUserId === operatorUserId;

  const patch = { updatedAt: now };
  if (isPublisher) {
    patch.confirmByPublisherAt = now;
  }
  if (isAssignee) {
    patch.confirmByAssigneeAt = now;
  }

  const publisherConfirmed = patch.confirmByPublisherAt || task.confirmByPublisherAt;
  const assigneeConfirmed = patch.confirmByAssigneeAt || task.confirmByAssigneeAt;

  if (publisherConfirmed && assigneeConfirmed) {
    patch.status = "completed";
    patch.completedAt = now;
  }

  return patch;
}

export async function updateTaskStatus(taskId, status, operatorUserId) {
  assertActionRateLimit(`task:status:${operatorUserId || ""}:${taskId}:${status}`, {
    intervalMs: 900,
    message: "操作过于频繁，请稍后再试"
  });
  assertActionBurstLimit(`task:status:target:${operatorUserId || ""}:${taskId}`, {
    windowMs: 10000,
    maxCount: 6,
    message: "任务操作过于频繁，请稍后再试"
  });

  if (status === "confirm_complete") {
    return handleDualConfirmComplete(taskId, operatorUserId);
  }

  const cloudResult = await updateTaskStatusInCloud(taskId, status, operatorUserId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    if (cloudResult && status === "completed") {
      addPoints("complete_task", taskId).catch(() => null);
      recordTaskCompletion().catch(() => null);
    }
    if (cloudResult) {
      const currentTask = await getTaskById(taskId).catch(() => null);
      logAuditEvent("task_status_changed", {
        taskId,
        toStatus: status,
        operatorUserId: operatorUserId || "",
        taskType: currentTask?.type || "",
        channel: "cloud"
      }).catch(() => null);
    }
    return cloudResult;
  }

  ensureTasks();
  const list = readTasks();
  const index = list.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return false;
  }

  const current = list[index];
  if (!isTaskStatusTransitionAllowed(current.status, status)) {
    return false;
  }

  if (!canOperateTask(current, operatorUserId, status)) {
    return false;
  }

  const now = Date.now();
  list.splice(index, 1, {
    ...current,
    status,
    completedAt: status === "completed" ? now : (current.completedAt || null),
    cancelledAt: status === "cancelled" ? now : (current.cancelledAt || null),
    pickedUpAt: status === "picked_up" ? now : (current.pickedUpAt || null),
    deliveredAt: status === "delivered" ? now : (current.deliveredAt || null),
    updatedAt: now
  });
  saveTasks(list);

  if (status === "completed") {
    addPoints("complete_task", taskId).catch(() => null);
    recordTaskCompletion().catch(() => null);
  }

  logAuditEvent("task_status_changed", {
    taskId,
    fromStatus: current.status,
    toStatus: status,
    operatorUserId: operatorUserId || "",
    taskType: current.type || "",
    channel: "local"
  }).catch(() => null);

  await wait();
  return true;
}

async function handleDualConfirmComplete(taskId, operatorUserId) {
  const task = await getTaskById(taskId).catch(() => null);
  if (!task || task.status !== "assigned") {
    return false;
  }

  if (!canOperateTask(task, operatorUserId, "confirm_complete")) {
    return false;
  }

  const patch = applyDualConfirm(task, operatorUserId);

  const collection = getTaskCollection();
  if (collection) {
    const updateRes = await collection
      .where({
        _id: taskId,
        status: task.status,
        updatedAt: Number(task.updatedAt || 0)
      })
      .update({ data: patch })
      .catch(() => null);
    if (updateRes && updateRes.stats && updateRes.stats.updated > 0) {
      if (patch.status === "completed") {
        addPoints("complete_task", taskId).catch(() => null);
        recordTaskCompletion().catch(() => null);
      }
      logAuditEvent("task_dual_confirm", {
        taskId,
        operatorUserId: operatorUserId || "",
        resultStatus: patch.status || "assigned",
        channel: "cloud"
      }).catch(() => null);
      return patch.status === "completed" ? true : "confirmed";
    }

    const latestRes = await collection.doc(taskId).get().catch(() => null);
    const latestTask = normalizeTask(latestRes?.data || {});
    if (latestTask.id) {
      if (latestTask.status === "completed") {
        return true;
      }
      if (latestTask.confirmByAssigneeAt || latestTask.confirmByPublisherAt) {
        return "confirmed";
      }
      return false;
    }
  }

  ensureTasks();
  const list = readTasks();
  const index = list.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return false;
  }

  list.splice(index, 1, { ...list[index], ...patch });
  saveTasks(list);

  if (patch.status === "completed") {
    addPoints("complete_task", taskId).catch(() => null);
    recordTaskCompletion().catch(() => null);
  }

  logAuditEvent("task_dual_confirm", {
    taskId,
    operatorUserId: operatorUserId || "",
    resultStatus: patch.status || "assigned",
    channel: "local"
  }).catch(() => null);

  await wait();
  return patch.status === "completed" ? true : "confirmed";
}
