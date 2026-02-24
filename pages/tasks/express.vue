<template>
  <view class="express-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-top">
        <view>
          <view class="title">📦 快递代取专区</view>
          <view class="desc">校园高频场景，支持快速发单与抢单</view>
        </view>
      </view>
      <view class="banner-actions">
        <button class="publish-btn btn-bounce" size="mini" @tap="quickPublish">⚡ 快速发单</button>
        <button class="refresh-btn btn-bounce" size="mini" @tap="loadTasks(true)">刷新列表</button>
      </view>
    </view>

    <view class="hint anim-fade-in anim-d1">
      <text class="hint-icon">💡</text>
      按截止最急优先排序，建议先处理紧急单
    </view>

    <view :class="['task-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 2)) : '']" style="border-radius: 24rpx;" v-for="(task, idx) in sortedList" :key="task.id" @tap="goTaskDetail(task.id)">
      <view class="head">
        <view class="task-title">{{ task.title }}</view>
        <view class="reward">¥{{ task.reward }}</view>
      </view>
      <view class="meta">{{ task.time }} · {{ task.location }}</view>
      <view class="sub-meta">
        <text class="countdown">{{ getCountdownText(task) }}</text>
        <text v-if="isUrgentTask(task)" class="urgent">紧急</text>
      </view>
      <view class="foot">
        <text class="publisher">发布者：{{ task.publisher }}</text>
        <button v-if="task.status === 'open'" class="take-btn" size="mini" @tap.stop="takeExpressTask(task)">立即抢单</button>
        <view v-else class="taken-tag">进行中</view>
      </view>
    </view>

    <empty-state
      v-if="sortedList.length === 0"
      title="暂无快递代取任务"
      description="你可以先快速发布一个代取单"
      action-text="快速发单"
      @action="quickPublish"
    />
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { listTasks, takeTask } from "@/utils/task-service";

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      taskList: [],
      loading: false
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
      return [...this.taskList].sort((a, b) => Number(a.deadlineAt || 9999999999999) - Number(b.deadlineAt || 9999999999999));
    }
  },

  onShow() {
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.loadTasks(true).finally(() => {
      uni.stopPullDownRefresh();
    });
  },

  methods: {
    normalizeTaskType(type) {
      return type === "代取" ? "代取快递" : type;
    },

    async loadTasks(showToast = false) {
      this.loading = true;
      try {
        const list = await listTasks().catch(() => []);
        this.taskList = list.filter((item) => this.normalizeTaskType(item.type) === "代取快递");
        if (showToast) {
          uni.showToast({ title: "已刷新", icon: "none" });
        }
      } finally {
        this.loading = false;
      }
    },

    quickPublish() {
      if (!this.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }

      uni.navigateTo({
        url: "/pages/tasks/publish?type=%E4%BB%A3%E5%8F%96%E5%BF%AB%E9%80%92&quick=1"
      });
    },

    goTaskDetail(taskId) {
      uni.navigateTo({
        url: `/pages/tasks/detail?id=${taskId}`
      });
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
      if (diff < hour) {
        return `剩余${Math.max(1, Math.ceil(diff / minute))}分钟`;
      }
      return `剩余${Math.ceil(diff / hour)}小时`;
    },

    isUrgentTask(task) {
      const deadlineAt = Number(task.deadlineAt || 0);
      if (!deadlineAt) {
        return false;
      }
      const diff = deadlineAt - Date.now();
      return diff > 0 && diff <= 1000 * 60 * 60 * 2;
    },

    takeExpressTask(task) {
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
        title: "确认抢单",
        content: `确认抢取快递代取任务？\n赏金 ¥${task.reward}，地点：${task.location || '待定'}\n${this.getCountdownText(task)}`,
        confirmText: "确认抢单",
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          const ok = await takeTask(task.id, profile.nickName || "校园用户", profile.userId);
          if (!ok) {
            uni.showToast({
              title: "抢单失败，请刷新后重试",
              icon: "none"
            });
            return;
          }

          uni.showToast({
            title: "抢单成功",
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
.express-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  overflow: hidden;
  background: $page-bg;
}

.page-orbs {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.45;
}
.orb-1 {
  width: 180rpx; height: 180rpx;
  top: -20rpx; left: -30rpx;
  background: radial-gradient(circle, rgba(250, 170, 50, 0.28), transparent 70%);
}
.orb-2 {
  width: 140rpx; height: 140rpx;
  top: 350rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%);
}

.banner {
  position: relative;
  padding: 28rpx;
  margin-bottom: 4rpx;
  overflow: hidden;
}
.banner-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250, 170, 50, 0.1), transparent);
  pointer-events: none;
}
.banner-top {
  position: relative;
}

.title {
  color: #1a2540;
  font-size: 36rpx;
  font-weight: 800;
}

.desc {
  margin-top: 8rpx;
  color: #5a6a88;
  font-size: 24rpx;
}

.banner-actions {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.publish-btn {
  margin: 0;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  border: none;
  background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 18rpx rgba(241, 113, 45, 0.3);
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.publish-btn::after { border: none; }

.refresh-btn {
  margin: 0;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 28rpx;
  border-radius: 32rpx;
  border: none;
  background: rgba(238, 242, 251, 0.7);
  color: #3f4f6f;
  font-size: 24rpx;
  font-weight: 600;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
}
.refresh-btn::after { border: none; }

.hint {
  margin: 16rpx 4rpx 12rpx;
  color: #8a95ac;
  font-size: 23rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.hint-icon { font-size: 20rpx; }

.task-card {
  margin-bottom: 14rpx;
  padding: 22rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  color: #1a2540;
  font-size: 29rpx;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward {
  color: #e74a62;
  font-size: 30rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #fff0f2, #ffedf1);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.meta {
  margin-top: 8rpx;
  color: #738099;
  font-size: 24rpx;
}

.sub-meta {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.countdown {
  color: #4f6285;
  font-size: 22rpx;
}

.urgent {
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
  background: linear-gradient(135deg, #ffe4e8, #ffe9ec);
  color: #e34d63;
  font-size: 20rpx;
  font-weight: 600;
  animation: anim-pulse 2s ease-in-out infinite;
  border: 1rpx solid rgba(227, 77, 99, 0.1);
}

.foot {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.publisher {
  color: #7b879d;
  font-size: 23rpx;
}

.take-btn {
  margin: 0;
  min-width: 140rpx;
  height: 56rpx;
  line-height: 56rpx;
  border: none;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff;
  font-size: 23rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 14rpx rgba(241, 113, 45, 0.25);
}
.take-btn::after { border: none; }

.taken-tag {
  min-width: 140rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 28rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #68738b;
  font-size: 23rpx;
  font-weight: 500;
}
</style>
