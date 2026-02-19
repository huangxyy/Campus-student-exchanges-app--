import { getCloudDatabase } from "@/utils/cloud";
import { showError, withGuard } from "@/utils/error-handler";
import { generateId } from "@/utils/common";
import { sanitizeText } from "@/utils/sanitize";
import { addPoints } from "@/utils/points-service";
import { recordTaskCompletion } from "@/utils/trust-service";

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
    status: task.status || "open",
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

function isTaskStatusTransitionAllowed(currentStatus, nextStatus) {
  const transitions = {
    open: ["assigned", "cancelled"],
    assigned: ["picked_up", "completed", "cancelled"],
    picked_up: ["delivered", "cancelled"],
    delivered: ["completed", "cancelled"],
    completed: [],
    cancelled: []
  };
  const allowed = transitions[currentStatus] || [];
  return allowed.includes(nextStatus);
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

  if (nextStatus === "completed") {
    return task.publisherId === operatorUserId;
  }

  return task.publisherId === operatorUserId || task.assignedUserId === operatorUserId;
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
    .doc(taskId)
    .update({
      data: {
        status,
        ...statusPatch,
        updatedAt: now
      }
    })
    .catch(() => null);

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

export async function updateTaskStatus(taskId, status, operatorUserId) {
  const cloudResult = await updateTaskStatusInCloud(taskId, status, operatorUserId).catch(() => null);
  if (typeof cloudResult === "boolean") {
    if (cloudResult && status === "completed") {
      addPoints("complete_task", taskId).catch(() => null);
      recordTaskCompletion().catch(() => null);
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

  await wait();
  return true;
}
