<template>
  <view class="tasks-page">
    <view class="banner card anim-slide-down">
      <view class="title-row">
        <view class="title">任务大厅</view>
        <view class="badge anim-pulse">校内互助</view>
      </view>
      <view class="desc">发布代取、代课、代会等校园任务，支持紧急单快速抢单</view>
      <view class="banner-pills">
        <text class="pill">{{ sortedList.length }} 条任务</text>
        <text class="pill">截止优先</text>
        <text class="pill">距离优先</text>
      </view>
      <view class="banner-actions">
        <button class="express-btn btn-bounce" size="mini" @tap="goExpressZone">快递代取专区</button>
        <button class="publish-task-btn btn-bounce" size="mini" @tap="goPublishTask">发布任务</button>
        <button class="my-task-btn btn-bounce" size="mini" @tap="goMyTasks">我的任务</button>
      </view>
    </view>

    <view class="sync-tip card anim-fade-in anim-d1">
      <view class="sync-icon">ⓘ</view>
      <text :class="['sync-text', syncMode === 'polling' ? 'sync-text-warn' : '']">{{ syncHintText }}</text>
    </view>

    <view class="list-head anim-fade-in anim-d1">
      <view class="head-title">任务分类</view>
    </view>
    <view class="type-row anim-slide-up anim-d2">
      <text
        v-for="item in taskTypes"
        :key="item"
        :class="['type', currentType === item ? 'active' : '']"
        @tap="currentType = item"
      >
        {{ item }}
      </text>
    </view>

    <view class="list-head sort-head anim-fade-in anim-d2">
      <view class="head-title">排序方式</view>
    </view>
    <view class="type-row sort-row anim-slide-up anim-d3">
      <text
        v-for="item in sortOptions"
        :key="item.value"
        :class="['type', sortBy === item.value ? 'active' : '']"
        @tap="sortBy = item.value"
      >
        {{ item.label }}
      </text>
    </view>

    <view v-if="newTaskCount > 0" class="new-task-tip anim-scale-in press-able" @tap="refreshNewTasks">有 {{ newTaskCount }} 条新任务，点击刷新</view>

    <view :class="['task-card', 'card', 'card-press', 'anim-slide-up', `status-${task.status}`]" v-for="task in pagedList" :key="task.id" @tap="goTaskDetail(task.id)">
      <view class="head">
        <view class="task-title">{{ task.title }}</view>
        <view class="reward">赏金 ¥{{ task.reward }}</view>
      </view>
      <view class="meta">
        <text>{{ normalizeTaskType(task.type) }} · {{ task.time }} · {{ task.location }}</text>
        <text :class="['status-chip', task.status]">{{ getStatusText(task.status) }}</text>
      </view>
      <view class="sub-meta">
        <text class="countdown">{{ getCountdownText(task) }}</text>
        <text v-if="isUrgentTask(task)" class="urgent">紧急</text>
        <text class="distance">{{ getDistanceText(task) }}</text>
      </view>
      <view class="foot">
        <text class="publisher">
          发布者：{{ task.publisher }}
          <text v-if="task.status === 'assigned'"> · 已被 {{ task.assignedUser }} 接单</text>
        </text>
        <button v-if="task.status === 'open'" class="take-btn btn-bounce" size="mini" @tap.stop="handleTakeTask(task)">立即接单</button>
        <view v-else class="taken-tag">已接单</view>
      </view>
    </view>

    <view v-if="pagedList.length > 0 && hasMore" class="load-more-hint">上拉加载更多任务</view>

    <empty-state
      v-if="sortedList.length === 0"
      title="当前分类暂无任务"
      description="你可以切换分类，或稍后再来"
      action-text="发布任务"
      @action="goPublishTask"
    />
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { listTasks, takeTask, watchOpenTasks } from "@/utils/task-service";

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      taskTypes: ["全部", "代课", "站岗", "代会", "代取快递", "跑腿", "其他"],
      currentType: "全部",
      sortBy: "latest",
      sortOptions: [
        { label: "最新发布", value: "latest" },
        { label: "报酬最高", value: "rewardDesc" },
        { label: "距离最近", value: "distanceAsc" },
        { label: "截止最急", value: "deadlineAsc" }
      ],
      taskList: [],
      pageSize: 12,
      visibleCount: 12,
      newTaskCount: 0,
      latestKnownCreatedAt: 0,
      checkTimer: null,
      checkingNewTasks: false,
      taskWatcher: null,
      watchRetryTimer: null,
      watchRetryCount: 0,
      syncMode: "idle"
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    sortedList() {
      let list = [...this.taskList];

      if (this.currentType === "全部") {
        list = [...list];
      } else {
        list = list.filter((item) => this.normalizeTaskType(item.type) === this.currentType);
      }

      if (this.sortBy === "rewardDesc") {
        list.sort((a, b) => Number(b.reward || 0) - Number(a.reward || 0));
      } else if (this.sortBy === "distanceAsc") {
        list.sort((a, b) => Number(a.distanceKm ?? 9999) - Number(b.distanceKm ?? 9999));
      } else if (this.sortBy === "deadlineAsc") {
        list.sort((a, b) => Number(a.deadlineAt || 9999999999999) - Number(b.deadlineAt || 9999999999999));
      } else {
        list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      }

      return list;
    },

    pagedList() {
      return this.sortedList.slice(0, this.visibleCount);
    },

    hasMore() {
      return this.sortedList.length > this.visibleCount;
    },

    syncHintText() {
      if (this.syncMode === "watch") {
        return "任务实时连接已启用（云 watch）";
      }
      if (this.syncMode === "polling") {
        return "实时连接波动，已切换轮询同步（自动重连中）";
      }
      return "任务优先读取云数据库，云不可用时自动回退本地缓存。";
    }
  },

  onShow() {
    this.loadTasks();
    this.startRealtimeSync();
  },

  onHide() {
    this.stopRealtimeSync();
    this.stopNewTaskPolling();
    this.stopWatchReconnect();
  },

  onUnload() {
    this.stopRealtimeSync();
    this.stopNewTaskPolling();
    this.stopWatchReconnect();
  },

  onPullDownRefresh() {
    this.refreshNewTasks().finally(() => {
      uni.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (!this.hasMore) {
      uni.showToast({
        title: "没有更多任务了",
        icon: "none"
      });
      return;
    }

    this.visibleCount += this.pageSize;
  },

  methods: {
    async loadTasks(options = {}) {
      const list = await listTasks().catch(() => []);
      this.taskList = list;

      this.visibleCount = this.pageSize;
      this.newTaskCount = 0;
      this.latestKnownCreatedAt = list.reduce((max, item) => Math.max(max, Number(item.createdAt || 0)), 0);

      if (options.toast) {
        uni.showToast({
          title: "已刷新任务列表",
          icon: "none"
        });
      }
    },

    startRealtimeSync() {
      this.stopRealtimeSync();
      this.stopWatchReconnect();

      const watcher = watchOpenTasks({
        onChange: (list) => {
          this.applyRealtimeList(list);
          this.syncMode = "watch";
          this.watchRetryCount = 0;
          this.stopNewTaskPolling();
        },
        onError: () => {
          this.stopRealtimeSync();
          this.switchToPollingMode();
          this.scheduleWatchReconnect();
        }
      });

      if (watcher) {
        this.taskWatcher = watcher;
        this.syncMode = "watch";
        this.watchRetryCount = 0;
        this.stopNewTaskPolling();
        return;
      }

      this.switchToPollingMode();
      this.scheduleWatchReconnect();
    },

    stopRealtimeSync() {
      if (this.taskWatcher && typeof this.taskWatcher.close === "function") {
        this.taskWatcher.close();
      }
      this.taskWatcher = null;
    },

    switchToPollingMode() {
      this.syncMode = "polling";
      this.startNewTaskPolling();
    },

    scheduleWatchReconnect() {
      if (this.taskWatcher || this.watchRetryTimer) {
        return;
      }

      const baseRetryMs = Math.min(30000, 5000 + this.watchRetryCount * 4000);
      const jitterMs = Math.floor(Math.random() * 2000);
      const retryMs = baseRetryMs + jitterMs;
      this.watchRetryTimer = setTimeout(() => {
        this.watchRetryTimer = null;
        this.watchRetryCount += 1;
        this.startRealtimeSync();
      }, retryMs);
    },

    stopWatchReconnect() {
      if (this.watchRetryTimer) {
        clearTimeout(this.watchRetryTimer);
      }
      this.watchRetryTimer = null;
    },

    applyRealtimeList(list) {
      const newCount = this.latestKnownCreatedAt
        ? list.filter((item) => Number(item.createdAt || 0) > this.latestKnownCreatedAt).length
        : 0;
      if (newCount > 0) {
        this.newTaskCount = newCount;
      }
      this.taskList = list;
    },

    startNewTaskPolling() {
      this.stopNewTaskPolling();
      this.checkTimer = setInterval(() => {
        if (this.syncMode !== "polling") {
          return;
        }
        this.checkNewTasks();
      }, 8000);
    },

    stopNewTaskPolling() {
      if (!this.checkTimer) {
        return;
      }

      clearInterval(this.checkTimer);
      this.checkTimer = null;
    },

    async checkNewTasks() {
      if (this.syncMode !== "polling") {
        return;
      }

      if (this.checkingNewTasks) {
        return;
      }

      this.checkingNewTasks = true;
      try {
        const latestList = await listTasks().catch(() => []);
        const newCount = this.latestKnownCreatedAt
          ? latestList.filter((item) => Number(item.createdAt || 0) > this.latestKnownCreatedAt).length
          : 0;
        if (newCount > 0) {
          this.newTaskCount = newCount;
        }
        if (latestList.length !== this.taskList.length || newCount > 0) {
          this.taskList = latestList;
        }
      } finally {
        this.checkingNewTasks = false;
      }
    },

    async refreshNewTasks() {
      await this.loadTasks({ toast: true });
    },

    getStatusText(status) {
      const map = {
        open: "待接单",
        assigned: "进行中",
        picked_up: "已取件",
        delivered: "已送达",
        completed: "已完成",
        cancelled: "已取消"
      };
      return map[status] || "未知状态";
    },

    normalizeTaskType(type) {
      if (type === "代取") {
        return "代取快递";
      }
      return type || "其他";
    },

    getDistanceText(task) {
      if (typeof task.distanceKm !== "number") {
        return "距离未知";
      }
      if (task.distanceKm < 1) {
        return `${Math.max(1, Math.round(task.distanceKm * 1000))}m`;
      }
      return `${task.distanceKm.toFixed(1)}km`;
    },

    getCountdownText(task) {
      const deadlineAt = Number(task.deadlineAt || 0);
      if (!deadlineAt) {
        return "截止时间待定";
      }

      const diff = deadlineAt - Date.now();
      if (diff <= 0) {
        return "已截止";
      }

      const minute = 1000 * 60;
      const hour = minute * 60;
      const day = hour * 24;

      if (diff < hour) {
        return `剩余${Math.max(1, Math.ceil(diff / minute))}分钟`;
      }
      if (diff < day) {
        return `剩余${Math.ceil(diff / hour)}小时`;
      }
      return `剩余${Math.ceil(diff / day)}天`;
    },

    isUrgentTask(task) {
      const deadlineAt = Number(task.deadlineAt || 0);
      if (!deadlineAt) {
        return false;
      }

      const diff = deadlineAt - Date.now();
      return diff > 0 && diff <= 1000 * 60 * 60 * 2;
    },

    goTaskDetail(taskId) {
      uni.navigateTo({
        url: `/pages/tasks/detail?id=${taskId}`
      });
    },

    goPublishTask() {
      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }
      uni.navigateTo({
        url: "/pages/tasks/publish"
      });
    },

    goExpressZone() {
      uni.navigateTo({
        url: "/pages/tasks/express"
      });
    },

    goMyTasks() {
      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }
      uni.navigateTo({
        url: "/pages/tasks/my"
      });
    },

    handleTakeTask(task) {
      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }

      const profile = this.userStore.profile || {};
      if (!profile.userId) {
        uni.showToast({
          title: "登录信息异常，请重新登录",
          icon: "none"
        });
        return;
      }

      if (task.publisherId === profile.userId) {
        uni.showToast({
          title: "不能接自己发布的任务",
          icon: "none"
        });
        return;
      }

      uni.showModal({
        title: "确认接单",
        content: `确认接取任务「${task.title}」？\n赏金 ¥${task.reward}，地点：${task.location || '待定'}`,
        confirmText: "确认接单",
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          const ok = await takeTask(task.id, profile.nickName || "校园用户", profile.userId);
          if (!ok) {
            uni.showToast({
              title: "接单失败，请刷新后重试",
              icon: "none"
            });
            return;
          }

          uni.showToast({
            title: `已接单：${task.title}`,
            icon: "success"
          });
          this.loadTasks();
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.tasks-page {
  padding: 22rpx;
  padding-bottom: 120rpx;
  background:
    radial-gradient(circle at 8% 4%, rgba(56, 121, 255, 0.12), rgba(56, 121, 255, 0)),
    radial-gradient(circle at 92% 14%, rgba(38, 201, 159, 0.12), rgba(38, 201, 159, 0)),
    #f5f7fc;
}

.banner {
  padding: 26rpx;
  background:
    linear-gradient(145deg, rgba(234, 244, 255, 0.96), rgba(242, 250, 255, 0.98)),
    #ffffff;
  border: 1rpx solid rgba(220, 235, 248, 0.7);
  border-radius: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(31, 38, 66, 0.05);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  color: #1f2636;
  font-size: 34rpx;
  font-weight: 700;
}

.badge {
  height: 46rpx;
  line-height: 46rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: #2f6bff;
  color: #fff;
  font-size: 20rpx;
}

.desc {
  margin-top: 10rpx;
  color: #647188;
  font-size: 24rpx;
}

.banner-pills {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.pill {
  height: 40rpx;
  line-height: 40rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
  border: 1rpx solid #deecf8;
  color: #56749f;
  font-size: 20rpx;
}

.publish-task-btn {
  margin: 0;
  width: 180rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 32rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #2358ce);
  color: #fff;
  font-size: 22rpx;
}

.express-btn {
  margin: 0;
  width: 210rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 32rpx;
  border: none;
  background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff;
  font-size: 22rpx;
}

.banner-actions {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.my-task-btn {
  margin: 0;
  width: 180rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 32rpx;
  border: none;
  background: #edf1fb;
  color: #3a4b6f;
  font-size: 22rpx;
}

.list-head {
  margin: 18rpx 4rpx 6rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sort-head {
  margin-top: 12rpx;
}

.head-title {
  color: #33435f;
  font-size: 24rpx;
  font-weight: 600;
}

.type-row {
  margin: 10rpx 4rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.sort-row {
  margin-top: 4rpx;
}

.sync-tip {
  margin-top: 14rpx;
  padding: 16rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  border-left: 6rpx solid $primary-color;
}

.sync-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #eaf0ff;
  color: #2f6bff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  flex-shrink: 0;
}

.sync-text {
  color: #4f5d77;
  font-size: 23rpx;
  flex: 1;
}

.sync-text-warn {
  color: #b15e10;
}

.new-task-tip {
  margin: 6rpx 4rpx 14rpx;
  border-radius: 999rpx;
  padding: 12rpx 20rpx;
  background: #eef4ff;
  color: #2f6bff;
  font-size: 23rpx;
}

.type {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #eef2fb;
  color: #68748d;
  font-size: 22rpx;
}

.type.active {
  background: #2f6bff;
  color: #fff;
}

.task-card {
  margin-bottom: 16rpx;
  padding: 22rpx 22rpx 22rpx 28rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  position: relative;
  border-radius: 22rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(31, 38, 66, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 16rpx;
  bottom: 16rpx;
  width: 6rpx;
  border-radius: 0 6rpx 6rpx 0;
  background: #c0cce4;
  transition: background 0.3s ease;
}

.task-card.status-open::before {
  background: linear-gradient(180deg, #2f6bff, #5b8af5);
}

.task-card.status-assigned::before {
  background: linear-gradient(180deg, #f5a623, #e39a2f);
}

.task-card.status-completed::before {
  background: linear-gradient(180deg, #2ea269, #24b987);
}

.task-card.status-cancelled::before {
  background: #c0cce4;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 6rpx;
}

.task-title {
  color: #1a2540;
  font-size: 29rpx;
  font-weight: 700;
  flex: 1;
}

.reward {
  color: #e94b64;
  font-size: 24rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #fff0f2, #ffeef1);
  border-radius: 999rpx;
  padding: 8rpx 16rpx;
  border: 1rpx solid rgba(233, 75, 100, 0.08);
  flex-shrink: 0;
}

.meta {
  margin-top: 12rpx;
  color: #738099;
  font-size: 23rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  padding-left: 6rpx;
}

.sub-meta {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding-left: 6rpx;
}

.countdown {
  color: #4f6285;
  font-size: 22rpx;
  background: #f3f6fd;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.distance {
  color: #7f89a0;
  font-size: 22rpx;
}

.urgent {
  border-radius: 999rpx;
  padding: 4rpx 14rpx;
  background: linear-gradient(135deg, #ffe9ec, #ffecee);
  color: #e34d63;
  font-size: 20rpx;
  font-weight: 600;
  animation: anim-pulse 2s ease-in-out infinite;
}

.status-chip {
  flex-shrink: 0;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.status-chip.open {
  background: linear-gradient(135deg, #eaf2ff, #e4edff);
  color: #2f6bff;
}

.status-chip.assigned {
  background: linear-gradient(135deg, #fff4df, #fff1d6);
  color: #bd7b16;
}

.status-chip.completed {
  background: linear-gradient(135deg, #e8f7ef, #e2f5ea);
  color: #238a57;
}

.status-chip.cancelled {
  background: #f4f5f8;
  color: #7d879b;
}

.foot {
  margin-top: 16rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid #f0f3f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 6rpx;
}

.publisher {
  color: #7b879d;
  font-size: 23rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.take-btn {
  margin: 0;
  min-width: 140rpx;
  height: 58rpx;
  line-height: 58rpx;
  border: none;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.25);
}

.taken-tag {
  min-width: 140rpx;
  height: 58rpx;
  line-height: 58rpx;
  text-align: center;
  border-radius: 32rpx;
  background: #eef2fa;
  color: #68738b;
  font-size: 22rpx;
}

.load-more-hint {
  margin: 8rpx 0 16rpx;
  text-align: center;
  color: #8b95ab;
  font-size: 22rpx;
}
</style>
