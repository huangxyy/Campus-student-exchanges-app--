<template>
  <view class="my-tasks-page">
    <empty-state
      v-if="!isLogin"
      title="请先登录"
      description="登录后可查看我发布和我接取的任务"
      action-text="去登录"
      @action="goLogin"
    />

    <template v-else>
      <view class="header glass-strong anim-slide-down" style="border-radius: 28rpx;">
        <view class="title">📋 我的任务</view>
        <view class="stats">发布 {{ publishedList.length }} · 接取 {{ acceptedList.length }}</view>
      </view>

      <view class="tabs">
        <text :class="['tab', activeTab === 'published' ? 'active' : '']" @tap="activeTab = 'published'">
          我发布的
        </text>
        <text :class="['tab', activeTab === 'accepted' ? 'active' : '']" @tap="activeTab = 'accepted'">
          我接取的
        </text>
      </view>

      <view class="tabs scope-tabs">
        <text :class="['tab', recordScope === 'active' ? 'active' : '']" @tap="setScope('active')">
          进行中
        </text>
        <text :class="['tab', recordScope === 'history' ? 'active' : '']" @tap="setScope('history')">
          历史记录
        </text>
      </view>

      <view class="filter glass-strong" style="border-radius: 20rpx;">
        <scroll-view scroll-x class="filter-line">
          <text
            v-for="item in typeOptions"
            :key="item.value"
            :class="['filter-chip', typeFilter === item.value ? 'active' : '']"
            @tap="typeFilter = item.value"
          >
            {{ item.label }}
          </text>
        </scroll-view>

        <view class="filter-line">
          <text
            v-for="item in statusOptions"
            :key="item.value"
            :class="['filter-chip', statusFilter === item.value ? 'active' : '']"
            @tap="statusFilter = item.value"
          >
            {{ item.label }}
          </text>
        </view>

        <view class="filter-line">
          <text
            v-for="item in sortOptions"
            :key="item.value"
            :class="['filter-chip', sortBy === item.value ? 'active' : '']"
            @tap="sortBy = item.value"
          >
            {{ item.label }}
          </text>
        </view>
      </view>

      <view class="summary">当前筛选结果：{{ displayList.length }} 条</view>

      <view v-if="loading" class="loading">加载中...</view>

      <template v-else>
        <view v-for="item in displayList" :key="item.id" class="task-item glass-strong card-press" style="border-radius: 22rpx;">
          <view class="task-head">
            <view class="task-title">{{ item.title }}</view>
            <view class="reward">¥{{ item.reward }}</view>
          </view>

          <view class="meta">{{ normalizeTaskType(item.type) }} · {{ item.time }} · {{ item.location }}</view>
          <view class="status-row">
            <text class="status">状态：{{ getStatusText(item.status) }}</text>
            <text v-if="item.assignedUser" class="assignee">接单者：{{ item.assignedUser }}</text>
          </view>

          <view class="actions">
            <button class="op-btn" size="mini" @tap="goTaskDetail(item.id)">查看详情</button>
            <button
              v-if="recordScope === 'active' && activeTab === 'published' && item.status === 'open'"
              class="op-btn danger"
              size="mini"
              @tap="changeStatus(item, 'cancelled')"
            >
              取消任务
            </button>
            <button
              v-if="recordScope === 'active' && activeTab === 'published' && item.status === 'assigned'"
              class="op-btn danger"
              size="mini"
              @tap="changeStatus(item, 'cancelled')"
            >
              取消任务
            </button>
            <button
              v-if="recordScope === 'active' && item.status === 'assigned'"
              class="op-btn"
              size="mini"
              @tap="changeStatus(item, 'completed')"
            >
              标记完成
            </button>
          </view>
        </view>

        <empty-state
          v-if="displayList.length === 0"
          title="暂无任务记录"
          :description="emptyDescription"
        />
      </template>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { listMyTasks, updateTaskStatus } from "@/utils/task-service";
import { showError } from "@/utils/error-handler";

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      loading: false,
      activeTab: "published",
      recordScope: "active",
      typeFilter: "all",
      statusFilter: "all",
      sortBy: "latest",
      typeOptions: [
        { label: "全部类型", value: "all" },
        { label: "代取快递", value: "代取快递" },
        { label: "代会", value: "代会" },
        { label: "代课", value: "代课" },
        { label: "站岗", value: "站岗" },
        { label: "跑腿", value: "跑腿" },
        { label: "其他", value: "其他" }
      ],
      sortOptions: [
        { label: "最新发布", value: "latest" },
        { label: "报酬最高", value: "rewardDesc" },
        { label: "报酬最低", value: "rewardAsc" }
      ],
      publishedList: [],
      acceptedList: []
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    profile() {
      return this.userStore.profile || {};
    },

    sourceList() {
      return this.activeTab === "published" ? this.publishedList : this.acceptedList;
    },

    statusOptions() {
      if (this.recordScope === "history") {
        return [
          { label: "全部状态", value: "all" },
          { label: "已完成", value: "completed" },
          { label: "已取消", value: "cancelled" }
        ];
      }
      return [
        { label: "全部状态", value: "all" },
        { label: "待接单", value: "open" },
        { label: "进行中", value: "assigned" }
      ];
    },

    emptyDescription() {
      if (this.recordScope === "history") {
        return "暂无历史任务，可先完成或取消一条任务";
      }
      return "先去任务大厅发布或接取任务";
    },

    displayList() {
      let list = [...this.sourceList];

      if (this.recordScope === "history") {
        list = list.filter((item) => item.status === "completed" || item.status === "cancelled");
      } else {
        list = list.filter((item) => ["open", "assigned", "picked_up", "delivered"].includes(item.status));
      }

      if (this.typeFilter !== "all") {
        list = list.filter((item) => this.normalizeTaskType(item.type) === this.typeFilter);
      }

      if (this.statusFilter !== "all") {
        list = list.filter((item) => item.status === this.statusFilter);
      }

      if (this.sortBy === "rewardDesc") {
        list.sort((a, b) => Number(b.reward || 0) - Number(a.reward || 0));
      } else if (this.sortBy === "rewardAsc") {
        list.sort((a, b) => Number(a.reward || 0) - Number(b.reward || 0));
      } else {
        list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      }

      return list;
    }
  },

  watch: {
    activeTab() {
      this.typeFilter = "all";
      this.statusFilter = "all";
      this.sortBy = "latest";
    }
  },

  onShow() {
    this.loadMyTasks();
  },

  methods: {
    async loadMyTasks() {
      if (!this.isLogin) {
        this.publishedList = [];
        this.acceptedList = [];
        return;
      }

      if (!this.profile.userId) {
        this.publishedList = [];
        this.acceptedList = [];
        return;
      }

      this.loading = true;
      try {
        const res = await listMyTasks(this.profile.userId);
        this.publishedList = res.published || [];
        this.acceptedList = res.accepted || [];
      } catch (error) {
        showError(error, { title: "加载任务失败" });
      } finally {
        this.loading = false;
      }
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
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
      return map[status] || "未知";
    },

    normalizeTaskType(type) {
      if (type === "代取") {
        return "代取快递";
      }
      return type || "其他";
    },

    setScope(scope) {
      this.recordScope = scope;
      this.statusFilter = "all";
    },

    goTaskDetail(taskId) {
      uni.navigateTo({
        url: `/pages/tasks/detail?id=${taskId}`
      });
    },

    changeStatus(item, status) {
      const statusText = this.getStatusText(status);
      const confirmMap = {
        cancelled: { title: "取消任务", content: `确定取消任务「${item.title}」吗？取消后不可恢复。` },
        completed: { title: "完成任务", content: `确定将任务「${item.title}」标记为已完成吗？` }
      };
      const confirm = confirmMap[status] || { title: "操作确认", content: `确定将任务状态更新为${statusText}吗？` };

      uni.showModal({
        title: confirm.title,
        content: confirm.content,
        success: async (res) => {
          if (!res.confirm) {
            return;
          }
          const ok = await updateTaskStatus(item.id, status, this.profile.userId);
          if (!ok) {
            showError("UNKNOWN", { title: "操作失败" });
            return;
          }
          uni.showToast({
            title: `已更新为${statusText}`,
            icon: "success"
          });
          this.loadMyTasks();
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.my-tasks-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  background: $page-bg;
}

.header {
  padding: 24rpx;
  margin-bottom: 4rpx;
}

.title {
  color: #1a2540;
  font-size: 34rpx;
  font-weight: 800;
}

.stats {
  margin-top: 8rpx;
  color: #5a6a88;
  font-size: 24rpx;
}

.tabs {
  margin: 14rpx 0;
  display: flex;
  gap: 10rpx;
}

.scope-tabs {
  margin-top: 0;
}

.tab {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #5f708e;
  font-size: 24rpx;
  font-weight: 600;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: all 0.25s ease;
}

.tab.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.25);
}

.loading {
  margin-top: 80rpx;
  text-align: center;
  color: #8c95aa;
  font-size: 24rpx;
}

.filter {
  padding: 16rpx;
}

.filter-line {
  white-space: nowrap;
}

.filter-line + .filter-line {
  margin-top: 10rpx;
}

.filter-chip {
  display: inline-block;
  margin-right: 10rpx;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.6);
  color: #5f708e;
  font-size: 23rpx;
  font-weight: 500;
  transition: all 0.2s ease;
}

.filter-chip.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  box-shadow: 0 3rpx 10rpx rgba(47, 107, 255, 0.2);
}

.summary {
  margin: 12rpx 4rpx;
  color: #7a8498;
  font-size: 23rpx;
}

.task-item {
  margin-bottom: 12rpx;
  padding: 18rpx;
}

.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-title {
  color: #1f2430;
  font-size: 28rpx;
  font-weight: 600;
}

.reward {
  color: #f05168;
  font-size: 30rpx;
  font-weight: 700;
}

.meta {
  margin-top: 10rpx;
  color: #71809a;
  font-size: 24rpx;
}

.status-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status,
.assignee {
  color: #6f7b92;
  font-size: 23rpx;
}

.actions {
  margin-top: 12rpx;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10rpx;
}

.op-btn {
  margin: 0;
  min-width: 140rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  border: none;
  background: linear-gradient(135deg, #e7efff, #dfe9ff);
  color: #325ec0;
  font-size: 23rpx;
  font-weight: 600;
}
.op-btn::after { border: none; }

.op-btn.danger {
  background: linear-gradient(135deg, #fceff1, #ffe8ec);
  color: #d5536a;
}
</style>
