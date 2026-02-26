<template>
  <view class="task-detail-page">
    <view v-if="loading" class="loading">加载任务详情中...</view>

    <empty-state
      v-else-if="!task"
      title="任务不存在"
      description="可能已被删除或链接失效"
      action-text="返回任务大厅"
      @action="goTaskList"
    />

    <template v-else>
      <view class="hero card">
        <view class="head">
          <view class="title">{{ task.title }}</view>
          <view class="reward-pill">
            <text class="reward-label">赏金</text>
            <text class="reward-value">¥{{ task.reward }}</text>
          </view>
        </view>
        <view class="status-row">
          <text :class="['ui-chip', statusChipTone]">{{ statusText }}</text>
          <text class="time">发布于 {{ createdAtText }}</text>
        </view>
        <view class="progress-track" v-if="task.status !== 'cancelled'">
          <view v-for="(step, idx) in progressSteps" :key="step.key" :class="['progress-step', step.active ? 'step-active' : '', step.done ? 'step-done' : '']">
            <view class="step-dot">{{ step.done ? '✓' : idx + 1 }}</view>
            <text class="step-label">{{ step.label }}</text>
          </view>
        </view>
      </view>

      <view class="section card">
        <view class="section-title">任务信息</view>
        <view class="line"><text class="k">类型</text><text class="v">{{ task.type || "其他" }}</text></view>
        <view class="line"><text class="k">时间</text><text class="v">{{ task.time || "未填写" }}</text></view>
        <view class="line"><text class="k">周期</text><text class="v">{{ task.isRecurring ? task.recurringRule : "一次性任务" }}</text></view>
        <view class="line"><text class="k">截止</text><text class="v">{{ deadlineText }}</text></view>
        <view class="line"><text class="k">地点</text><text class="v">{{ task.location || "未填写" }}</text></view>
        <view class="line"><text class="k">发布者</text><text class="v">{{ task.publisher || "校园用户" }}</text></view>
        <view class="line" v-if="task.assignedUser">
          <text class="k">接单者</text>
          <text class="v">{{ task.assignedUser }}</text>
        </view>
      </view>

      <view class="section card" v-if="task.requirements && task.requirements.length > 0">
        <view class="section-title">要求说明</view>
        <view class="requirement-tags">
          <text v-for="tag in task.requirements" :key="tag" class="ui-chip ui-chip-muted">{{ tag }}</text>
        </view>
      </view>

      <view class="section card">
        <view class="section-title">发布者信息</view>
        <view class="line"><text class="k">昵称</text><text class="v">{{ task.publisher || "校园用户" }}</text></view>
        <view class="line"><text class="k">信用星级</text><text class="v">{{ publisherStarsText }}</text></view>
        <view class="line"><text class="k">历史发布任务</text><text class="v">{{ publisherStats?.publishedCount || 0 }} 条</text></view>
      </view>

      <view class="section card" v-if="task.assignedUserId">
        <view class="section-title">接单者信誉</view>
        <view class="contact-status">{{ assigneeReputationText }}</view>
      </view>

      <view class="section card">
        <view class="section-title">任务说明</view>
        <view class="description">{{ task.description || "暂无补充说明" }}</view>
      </view>

      <view class="section card" v-if="isLogin && contactTarget">
        <view class="section-title">沟通状态</view>
        <view class="contact-status">{{ contactStatusText }}</view>
      </view>

      <view class="actions" v-if="showAnyAction">
        <button v-if="showLoginAction" class="ui-btn ui-btn-ghost action-btn" @tap="goLogin">登录后联系/接单</button>
        <button v-if="showContactAction" class="ui-btn ui-btn-secondary action-btn" :loading="submitting" @tap="contactPublisher">
          联系发布者
        </button>
        <button
          v-if="showContactAssigneeAction"
          class="ui-btn ui-btn-secondary action-btn"
          :loading="submitting"
          @tap="contactAssignee"
        >
          联系接单者
        </button>
        <button v-if="showTakeAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="takeCurrentTask">立即接单</button>
        <button v-if="showPickedUpAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('picked_up')">
          确认取件
        </button>
        <button v-if="showDeliveredAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('delivered')">
          确认送达
        </button>
        <button v-if="showDualConfirmAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="dualConfirmComplete">
          {{ myDualConfirmDone ? '等待对方确认' : '确认完成' }}
        </button>
        <button v-if="showCompleteAction" class="ui-btn ui-btn-primary action-btn" :loading="submitting" @tap="changeStatus('completed')">
          确认完成
        </button>
        <button v-if="showCancelAction" class="ui-btn ui-btn-danger action-btn" :loading="submitting" @tap="changeStatus('cancelled')">
          取消任务
        </button>
        <button v-if="showReportAction" class="ui-btn ui-btn-ghost action-btn" @tap="reportTask">
          举报
        </button>
      </view>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { useUserStore } from "@/store/user";
import { formatRelativeTime } from "@/utils/date";
import { createOrGetConversationByTask, getTaskConversationMeta } from "@/utils/chat-service";
import { getTaskById, getTaskUserStats, takeTask, updateTaskStatus } from "@/utils/task-service";
import { submitReport, REPORT_REASONS } from "@/utils/report-service";
import { showError } from "@/utils/error-handler";

export default {
  components: {
    EmptyState
  },

  data() {
    return {
      taskId: "",
      task: null,
      loading: false,
      submitting: false,
      contactMetaLoading: false,
      contactMeta: null,
      publisherStats: null,
      assigneeStats: null
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

    myUserId() {
      return this.profile.userId || "";
    },

    isOwner() {
      return !!this.task && !!this.myUserId && this.task.publisherId === this.myUserId;
    },

    isAssignee() {
      return !!this.task && !!this.myUserId && this.task.assignedUserId === this.myUserId;
    },

    statusText() {
      return this.getStatusText(this.task?.status);
    },

    isExpressTask() {
      if (!this.task) {
        return false;
      }
      const type = this.task.type === "代取" ? "代取快递" : this.task.type;
      return type === "代取快递";
    },

    statusChipTone() {
      const status = this.task?.status;
      const toneMap = {
        assigned: "ui-chip-warning",
        picked_up: "ui-chip-warning",
        delivered: "ui-chip-warning",
        completed: "ui-chip-success",
        cancelled: "ui-chip-muted"
      };
      return toneMap[status] || "ui-chip-primary";
    },

    createdAtText() {
      return this.task?.createdAt ? formatRelativeTime(this.task.createdAt) : "刚刚";
    },

    deadlineText() {
      if (!this.task?.deadlineAt) {
        return "未设置";
      }
      const deadlineAt = Number(this.task.deadlineAt);
      const diff = deadlineAt - Date.now();
      if (diff <= 0) {
        return "已截止";
      }

      const minute = 1000 * 60;
      const hour = minute * 60;
      const day = hour * 24;

      if (diff < hour) {
        return `${Math.max(1, Math.ceil(diff / minute))}分钟后截止`;
      }
      if (diff < day) {
        return `${Math.ceil(diff / hour)}小时后截止`;
      }

      const date = new Date(deadlineAt);
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const dayText = `${date.getDate()}`.padStart(2, "0");
      const hourText = `${date.getHours()}`.padStart(2, "0");
      const minuteText = `${date.getMinutes()}`.padStart(2, "0");
      return `${month}-${dayText} ${hourText}:${minuteText}`;
    },

    contactTarget() {
      if (!this.task || !this.isLogin) {
        return null;
      }

      if (this.isOwner && this.task.status === "assigned" && this.task.assignedUserId) {
        return {
          userId: this.task.assignedUserId,
          name: this.task.assignedUser || "接单者"
        };
      }

      if (!this.isOwner && this.task.publisherId) {
        return {
          userId: this.task.publisherId,
          name: this.task.publisher || "发布者"
        };
      }

      return null;
    },

    contactStatusText() {
      if (!this.contactTarget) {
        return "";
      }

      if (this.contactMetaLoading) {
        return `与${this.contactTarget.name}的沟通状态加载中...`;
      }

      if (!this.contactMeta || !this.contactMeta.hasContacted) {
        return `与${this.contactTarget.name}尚未沟通，可一键预置首条消息`;
      }

      if (!this.contactMeta.lastContactAt) {
        return `已与${this.contactTarget.name}沟通`;
      }

      return `最近与${this.contactTarget.name}沟通：${formatRelativeTime(this.contactMeta.lastContactAt)}`;
    },

    publisherStarsText() {
      const stars = Number(this.publisherStats?.creditStars || 0);
      if (!stars) {
        return "暂无";
      }
      return "★".repeat(stars);
    },

    assigneeReputationText() {
      if (!this.assigneeStats) {
        return "暂无信誉数据";
      }

      return `${this.assigneeStats.helperTag} · 已完成${this.assigneeStats.acceptedCompletedCount}单 · 好评率${this.assigneeStats.goodRate}%`;
    },

    showLoginAction() {
      return !!this.task && !this.isLogin;
    },

    showContactAction() {
      if (!this.task || !this.isLogin) {
        return false;
      }
      if (this.isOwner) {
        return false;
      }
      return !!this.task.publisherId;
    },

    showContactAssigneeAction() {
      if (!this.task || !this.isLogin) {
        return false;
      }
      if (!this.isOwner) {
        return false;
      }
      if (this.task.status !== "assigned") {
        return false;
      }
      return !!this.task.assignedUserId;
    },

    showTakeAction() {
      if (!this.task || !this.isLogin) {
        return false;
      }
      return this.task.status === "open" && !this.isOwner;
    },

    showPickedUpAction() {
      if (!this.task || !this.isLogin || !this.isExpressTask) {
        return false;
      }
      return this.task.status === "assigned" && this.isAssignee;
    },

    showDeliveredAction() {
      if (!this.task || !this.isLogin || !this.isExpressTask) {
        return false;
      }
      return this.task.status === "picked_up" && this.isAssignee;
    },

    showDualConfirmAction() {
      if (!this.task || !this.isLogin || this.isExpressTask) {
        return false;
      }
      if (this.task.status !== "assigned") {
        return false;
      }
      return this.isOwner || this.isAssignee;
    },

    myDualConfirmDone() {
      if (!this.task) {
        return false;
      }
      if (this.isOwner && this.task.confirmByPublisherAt) {
        return true;
      }
      if (this.isAssignee && this.task.confirmByAssigneeAt) {
        return true;
      }
      return false;
    },

    showCompleteAction() {
      if (!this.task || !this.isLogin) {
        return false;
      }
      if (this.isExpressTask) {
        return this.task.status === "delivered" && this.isOwner;
      }
      return false;
    },

    showCancelAction() {
      if (!this.task || !this.isLogin || !this.isOwner) {
        return false;
      }
      return ["open", "assigned", "picked_up", "delivered"].includes(this.task.status);
    },

    showReportAction() {
      return !!this.task && this.isLogin && !this.isOwner;
    },

    showAnyAction() {
      return (
        this.showLoginAction ||
        this.showContactAction ||
        this.showContactAssigneeAction ||
        this.showTakeAction ||
        this.showPickedUpAction ||
        this.showDeliveredAction ||
        this.showCompleteAction ||
        this.showCancelAction ||
        this.showReportAction
      );
    },

    progressSteps() {
      const status = this.task?.status || "open";
      const flow = this.isExpressTask
        ? ["open", "assigned", "picked_up", "delivered", "completed"]
        : ["open", "assigned", "completed"];
      const labels = { open: "待接单", assigned: "已接单", picked_up: "已取件", delivered: "已送达", completed: "已完成" };
      const currentIdx = flow.indexOf(status);
      return flow.map((key, idx) => ({
        key,
        label: labels[key] || key,
        done: idx < currentIdx,
        active: idx === currentIdx
      }));
    }
  },

  onLoad(query) {
    this.taskId = query.id || "";
    this.loadTask();
  },

  onShow() {
    if (this.taskId) {
      this.loadTask();
    }
  },

  methods: {
    getStatusText(status) {
      const map = {
        open: "待接单",
        assigned: "已接单",
        picked_up: "已取件",
        delivered: "已送达",
        completed: "已完成",
        cancelled: "已取消"
      };
      return map[status] || "未知状态";
    },

    async loadTask() {
      if (!this.taskId) {
        this.task = null;
        this.contactMeta = null;
        this.publisherStats = null;
        this.assigneeStats = null;
        return;
      }

      this.loading = true;
      try {
        this.task = await getTaskById(this.taskId);
        await Promise.all([this.loadContactMeta(), this.loadParticipantStats()]);
      } catch (error) {
        this.task = null;
        this.contactMeta = null;
        this.publisherStats = null;
        this.assigneeStats = null;
        showError(error, { title: "任务加载失败" });
      } finally {
        this.loading = false;
      }
    },

    buildTaskPresetMessage() {
      if (!this.task) {
        return "";
      }

      const timeText = this.task.time || "待确认";
      const locationText = this.task.location || "待确认";
      const titleText = this.task.title || "任务";
      const raw = `你好，我想咨询任务《${titleText}》，时间：${timeText}，地点：${locationText}。`;
      return raw.slice(0, 180);
    },

    async loadContactMeta() {
      this.contactMeta = null;
      this.contactMetaLoading = false;

      if (!this.task || !this.contactTarget) {
        return;
      }

      this.contactMetaLoading = true;
      try {
        this.contactMeta = await getTaskConversationMeta(this.task.id, this.contactTarget.userId);
      } catch (error) {
        this.contactMeta = null;
      } finally {
        this.contactMetaLoading = false;
      }
    },

    async loadParticipantStats() {
      this.publisherStats = null;
      this.assigneeStats = null;

      if (!this.task) {
        return;
      }

      const publisherId = this.task.publisherId || "";
      const assigneeId = this.task.assignedUserId || "";

      const [publisherStats, assigneeStats] = await Promise.all([
        publisherId ? getTaskUserStats(publisherId).catch(() => null) : Promise.resolve(null),
        assigneeId ? getTaskUserStats(assigneeId).catch(() => null) : Promise.resolve(null)
      ]);

      this.publisherStats = publisherStats;
      this.assigneeStats = assigneeStats;
    },

    goTaskList() {
      uni.switchTab({
        url: "/pages/tasks/list"
      });
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    },

    async contactPublisher() {
      if (this.submitting) {
        return;
      }
      if (!this.isLogin) {
        this.goLogin();
        return;
      }

      if (!this.task || !this.task.publisherId) {
        uni.showToast({
          title: "发布者信息缺失",
          icon: "none"
        });
        return;
      }

      if (this.isOwner) {
        uni.showToast({
          title: "这是你发布的任务",
          icon: "none"
        });
        return;
      }

      this.submitting = true;
      try {
        await this.openTaskConversation(this.task.publisherId, this.task.publisher);
      } catch (error) {
        showError(error, { title: "打开会话失败" });
      } finally {
        this.submitting = false;
      }
    },

    async contactAssignee() {
      if (this.submitting) {
        return;
      }
      if (!this.isLogin) {
        this.goLogin();
        return;
      }

      if (!this.task || !this.task.assignedUserId) {
        uni.showToast({
          title: "接单者信息缺失",
          icon: "none"
        });
        return;
      }

      if (!this.isOwner) {
        uni.showToast({
          title: "仅发布者可联系接单者",
          icon: "none"
        });
        return;
      }

      this.submitting = true;
      try {
        await this.openTaskConversation(this.task.assignedUserId, this.task.assignedUser);
      } catch (error) {
        showError(error, { title: "打开会话失败" });
      } finally {
        this.submitting = false;
      }
    },

    async openTaskConversation(peerId, peerName) {
      if (!this.task || !this.task.id || !peerId) {
        throw new Error("Invalid task conversation arguments");
      }

      let hasContacted =
        !!this.contactMeta && !!this.contactMeta.hasContacted && this.contactTarget && this.contactTarget.userId === peerId;

      if (!hasContacted) {
        const latestMeta = await getTaskConversationMeta(this.task.id, peerId).catch(() => null);
        if (latestMeta) {
          hasContacted = !!latestMeta.hasContacted;
          if (this.contactTarget && this.contactTarget.userId === peerId) {
            this.contactMeta = latestMeta;
          }
        }
      }

      const conversation = await createOrGetConversationByTask({
        taskId: this.task.id,
        taskTitle: this.task.title,
        peerId,
        peerName,
        peerAvatar: ""
      });

      const shouldPrefill = !hasContacted;
      const prefill = shouldPrefill ? this.buildTaskPresetMessage() : "";
      const query = prefill ? `&prefill=${encodeURIComponent(prefill)}` : "";

      uni.navigateTo({
        url: `/pages/chat/detail?conversationId=${conversation.id}${query}`
      });

      this.contactMeta = {
        hasContacted: true,
        conversationId: conversation.id,
        lastContactAt: Date.now()
      };
    },

    async takeCurrentTask() {
      if (this.submitting) {
        return;
      }
      if (!this.isLogin) {
        this.goLogin();
        return;
      }

      if (!this.myUserId) {
        uni.showToast({
          title: "登录信息异常，请重新登录",
          icon: "none"
        });
        return;
      }

      if (!this.task || this.task.status !== "open") {
        uni.showToast({
          title: "任务状态已变化，请刷新",
          icon: "none"
        });
        return;
      }

      if (this.isOwner) {
        uni.showToast({
          title: "不能接自己发布的任务",
          icon: "none"
        });
        return;
      }

      this.submitting = true;
      try {
        const ok = await takeTask(this.task.id, this.profile.nickName || "校园用户", this.myUserId);
        if (!ok) {
          uni.showToast({
            title: "接单失败，请刷新后重试",
            icon: "none"
          });
          return;
        }

        uni.showToast({
          title: "接单成功",
          icon: "success"
        });
        this.loadTask();
      } finally {
        this.submitting = false;
      }
    },

    reportTask() {
      if (this.submitting) {
        return;
      }
      if (!this.isLogin) {
        this.goLogin();
        return;
      }
      if (!this.task) { return; }

      const labels = REPORT_REASONS.map((r) => r.label);
      uni.showActionSheet({
        itemList: labels,
        success: async (res) => {
          const selected = REPORT_REASONS[res.tapIndex];
          if (!selected) { return; }
          if (this.submitting) { return; }
          this.submitting = true;
          try {
            await submitReport({
              targetType: "task",
              targetId: this.task.id,
              reason: selected.value,
              detail: `举报任务: ${this.task.title}`
            });
            uni.showToast({ title: "举报已提交，感谢反馈", icon: "success" });
          } catch (error) {
            showError(error, { title: "举报失败" });
          } finally {
            this.submitting = false;
          }
        }
      });
    },

    async dualConfirmComplete() {
      if (this.submitting) {
        return;
      }
      if (!this.isLogin || !this.task || this.task.status !== "assigned") {
        return;
      }
      if (this.myDualConfirmDone) {
        uni.showToast({ title: "你已确认，等待对方确认", icon: "none" });
        return;
      }
      this.submitting = true;
      try {
        const result = await updateTaskStatus(this.task.id, "confirm_complete", this.myUserId);
        if (result === true) {
          uni.showToast({ title: "双方已确认，任务完成", icon: "success" });
        } else if (result === "confirmed") {
          uni.showToast({ title: "已确认，等待对方确认", icon: "none" });
        } else {
          uni.showToast({ title: "状态已变化，正在刷新", icon: "none" });
        }
        this.loadTask();
      } finally {
        this.submitting = false;
      }
    },

    async changeStatus(status) {
      if (this.submitting) {
        return;
      }
      if (!this.task || !this.myUserId) {
        return;
      }

      this.submitting = true;
      try {
        const ok = await updateTaskStatus(this.task.id, status, this.myUserId);
        if (!ok) {
          uni.showToast({
            title: "状态已变化，正在刷新",
            icon: "none"
          });
          this.loadTask();
          return;
        }

        uni.showToast({
          title: `已更新为${this.getStatusText(status)}`,
          icon: "success"
        });
        this.loadTask();
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.task-detail-page {
  padding: 22rpx;
  padding-bottom: 182rpx;
  background:
    radial-gradient(circle at 8% 4%, rgba(57, 121, 255, 0.12), rgba(57, 121, 255, 0)),
    radial-gradient(circle at 93% 18%, rgba(48, 205, 170, 0.1), rgba(48, 205, 170, 0)),
    #f5f7fc;
}

.loading {
  margin-top: 100rpx;
  text-align: center;
  color: #8b95ab;
  font-size: 25rpx;
}

.hero {
  padding: 22rpx;
  background:
    linear-gradient(140deg, rgba(232, 242, 255, 0.96), rgba(246, 250, 255, 0.98)),
    #ffffff;
  border: 1rpx solid #e1ebff;
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
}

.title {
  flex: 1;
  color: #1f2430;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.5;
}

.reward-pill {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  background: linear-gradient(135deg, #fff0f2, #ffedf1);
  border-radius: 999rpx;
  padding: 8rpx 16rpx;
  border: 1rpx solid rgba(231, 74, 98, 0.08);
}
.reward-label {
  color: #a55b6a;
  font-size: 20rpx;
  font-weight: 500;
}
.reward-value {
  color: #e74a62;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: -0.5rpx;
}

.status-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.time {
  color: #7f8a9f;
  font-size: 22rpx;
}

.section {
  margin-top: 14rpx;
  padding: 20rpx;
}

.section-title {
  color: #25324a;
  font-size: 27rpx;
  font-weight: 600;
}

.line {
  margin-top: 14rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.k {
  color: #76839a;
  font-size: 23rpx;
}

.v {
  flex: 1;
  text-align: right;
  color: #273246;
  font-size: 23rpx;
  line-height: 1.45;
}

.description {
  margin-top: 12rpx;
  color: #4f5d75;
  font-size: 24rpx;
  line-height: 1.7;
}

.contact-status {
  margin-top: 12rpx;
  color: #5f6f89;
  font-size: 23rpx;
  line-height: 1.6;
}

.requirement-tags {
  margin-top: 12rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.progress-track {
  margin-top: 20rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 0 4rpx;
}
.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
  position: relative;
}
.step-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #eef2fb;
  color: #8a95ac;
  font-size: 20rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  border: 2rpx solid #e0e8f5;
  transition: all 0.3s ease;
}
.step-label {
  font-size: 20rpx;
  color: #8a95ac;
  text-align: center;
}
.step-done .step-dot {
  background: linear-gradient(135deg, #13c2a3, #24b987);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3rpx 10rpx rgba(19, 194, 163, 0.3);
}
.step-done .step-label {
  color: #2ea269;
  font-weight: 500;
}
.step-active .step-dot {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3rpx 10rpx rgba(47, 107, 255, 0.3);
  animation: anim-pulse 2s ease-in-out infinite;
}
.step-active .step-label {
  color: #2f6bff;
  font-weight: 600;
}

.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 20rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24rpx);
  -webkit-backdrop-filter: blur(24rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow: 0 -4rpx 20rpx rgba(31, 38, 66, 0.05);
  z-index: 100;
}

.action-btn {
  flex: 1;
}
</style>
