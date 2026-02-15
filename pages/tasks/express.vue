<template>
  <view class="express-page">
    <view class="banner card">
      <view class="title">快递代取专区</view>
      <view class="desc">校园高频场景，支持快速发单与抢单</view>
      <view class="banner-actions">
        <button class="publish-btn" size="mini" @tap="quickPublish">快速发单</button>
        <button class="refresh-btn" size="mini" @tap="loadTasks(true)">刷新列表</button>
      </view>
    </view>

    <view class="hint">按截止最急优先排序，建议先处理紧急单</view>

    <view class="task-card card" v-for="task in sortedList" :key="task.id" @tap="goTaskDetail(task.id)">
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
      taskList: []
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
      const list = await listTasks().catch(() => []);
      this.taskList = list.filter((item) => this.normalizeTaskType(item.type) === "代取快递");
      if (showToast) {
        uni.showToast({
          title: "已刷新",
          icon: "none"
        });
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

    async takeExpressTask(task) {
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
  }
};
</script>

<style lang="scss" scoped>
.express-page {
  padding: 22rpx;
}

.banner {
  padding: 22rpx;
  background: radial-gradient(circle at 90% 20%, rgba(245, 162, 66, 0.25), rgba(245, 162, 66, 0)), #fff;
}

.title {
  color: #1f2534;
  font-size: 34rpx;
  font-weight: 700;
}

.desc {
  margin-top: 8rpx;
  color: #6f7c94;
  font-size: 24rpx;
}

.banner-actions {
  margin-top: 14rpx;
  display: flex;
  gap: 10rpx;
}

.publish-btn {
  margin: 0;
  width: 180rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 30rpx;
  border: none;
  background: #ff8b3e;
  color: #fff;
  font-size: 22rpx;
}

.refresh-btn {
  margin: 0;
  width: 180rpx;
  height: 58rpx;
  line-height: 58rpx;
  border-radius: 30rpx;
  border: none;
  background: #eef2fb;
  color: #3f4f6f;
  font-size: 22rpx;
}

.hint {
  margin: 14rpx 4rpx;
  color: #8a93a7;
  font-size: 22rpx;
}

.task-card {
  margin-bottom: 12rpx;
  padding: 18rpx;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  color: #202633;
  font-size: 28rpx;
  font-weight: 600;
}

.reward {
  color: #ef4e66;
  font-size: 30rpx;
  font-weight: 700;
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
  padding: 4rpx 14rpx;
  background: #ffe9ec;
  color: #e34d63;
  font-size: 20rpx;
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
  height: 54rpx;
  line-height: 54rpx;
  border: none;
  border-radius: 30rpx;
  background: #ff8b3e;
  color: #fff;
  font-size: 22rpx;
}

.taken-tag {
  min-width: 140rpx;
  height: 54rpx;
  line-height: 54rpx;
  text-align: center;
  border-radius: 30rpx;
  background: #eef2fa;
  color: #68738b;
  font-size: 22rpx;
}
</style>
