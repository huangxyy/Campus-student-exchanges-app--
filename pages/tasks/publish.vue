<template>
  <view class="publish-task-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="header glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="header-deco"></view>
      <view class="header-title">📌 发布任务</view>
      <view class="header-desc">发布你的需求，等同学来帮忙</view>
    </view>

    <view class="form glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
      <view v-if="quickMode" class="quick-tip">
        <text class="quick-icon">⚡</text>
        快递代取专区快速发单
      </view>

      <view class="field">
        <view class="label">任务标题</view>
        <input v-model="form.title" class="input" maxlength="40" placeholder="例如：代取南门菜鸟快递" />
      </view>

      <view class="field">
        <view class="label">任务类型</view>
        <picker :range="taskTypes" @change="onTypeChange">
          <view class="picker">{{ form.type }}</view>
        </picker>
      </view>

      <view class="field row">
        <view class="col">
          <view class="label">报酬（元）</view>
          <input v-model="form.reward" class="input" type="digit" placeholder="20" />
        </view>
        <view class="col">
          <view class="label">任务时间描述</view>
          <input v-model="form.time" class="input" maxlength="30" placeholder="如：今天18:00前送到" />
        </view>
      </view>

      <view class="field">
        <view class="label">截止时间（可选）</view>
        <view class="row">
          <view class="col">
            <picker mode="date" :value="form.deadlineDate" @change="onDeadlineDateChange">
              <view class="picker">{{ form.deadlineDate || "选择日期" }}</view>
            </picker>
          </view>
          <view class="col">
            <picker mode="time" :value="form.deadlineTime" @change="onDeadlineTimeChange">
              <view class="picker">{{ form.deadlineTime || "选择时间" }}</view>
            </picker>
          </view>
        </view>
      </view>

      <view class="field row switch-row">
        <view class="label-inline">周期性任务</view>
        <switch :checked="form.isRecurring" color="#2f6bff" @change="onRecurringChange" />
      </view>

      <view class="field" v-if="form.isRecurring">
        <view class="label">重复规则</view>
        <picker :range="recurringOptions" @change="onRecurringRuleChange">
          <view class="picker">{{ form.recurringRule || recurringOptions[0] }}</view>
        </picker>
      </view>

      <view class="field">
        <view class="label">地点</view>
        <input v-model="form.location" class="input" maxlength="30" placeholder="例如：图书馆北门" />
      </view>

      <view class="field">
        <view class="label">任务说明</view>
        <textarea
          v-model="form.description"
          class="textarea"
          maxlength="300"
          placeholder="补充任务细节、要求和注意事项"
        ></textarea>
      </view>

      <view class="field">
        <view class="label">特殊要求（可多选）</view>
        <view class="req-tags">
          <text
            v-for="tag in requirementOptions"
            :key="tag"
            :class="['req-tag', form.requirements.includes(tag) ? 'active' : '']"
            @tap="toggleRequirement(tag)"
          >
            {{ tag }}
          </text>
        </view>
        <input
          v-model="form.customRequirement"
          class="input req-input"
          maxlength="20"
          placeholder="其他要求（选填）"
        />
      </view>
    </view>

    <button class="submit btn-bounce anim-slide-up anim-d2" :loading="submitting" @tap="submit">发布任务</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { publishTask } from "@/utils/task-service";

export default {
  data() {
    return {
      quickMode: false,
      taskTypes: ["代取快递", "跑腿", "代课", "站岗", "代会", "其他"],
      recurringOptions: ["每周一", "每周二", "每周三", "每周四", "每周五", "每周六", "每周日"],
      requirementOptions: ["守时", "需要男生", "需要女生", "熟悉路线", "可拍照确认", "需自备工具"],
      submitting: false,
      form: {
        title: "",
        type: "代取快递",
        reward: "",
        time: "",
        deadlineDate: "",
        deadlineTime: "",
        location: "",
        description: "",
        isRecurring: false,
        recurringRule: "每周一",
        requirements: [],
        customRequirement: ""
      }
    };
  },

  onLoad(query) {
    const incomingType = query.type ? decodeURIComponent(query.type) : "";
    if (incomingType && this.taskTypes.includes(incomingType)) {
      this.form.type = incomingType;
    }

    this.quickMode = query.quick === "1";
  },

  methods: {
    onTypeChange(event) {
      const index = Number(event.detail.value || 0);
      this.form.type = this.taskTypes[index] || this.taskTypes[0];
    },

    onDeadlineDateChange(event) {
      this.form.deadlineDate = event.detail.value || "";
    },

    onDeadlineTimeChange(event) {
      this.form.deadlineTime = event.detail.value || "";
    },

    onRecurringChange(event) {
      this.form.isRecurring = !!event.detail.value;
      if (!this.form.isRecurring) {
        this.form.recurringRule = this.recurringOptions[0];
      }
    },

    onRecurringRuleChange(event) {
      const index = Number(event.detail.value || 0);
      this.form.recurringRule = this.recurringOptions[index] || this.recurringOptions[0];
    },

    toggleRequirement(tag) {
      const current = this.form.requirements || [];
      if (current.includes(tag)) {
        this.form.requirements = current.filter((item) => item !== tag);
      } else {
        this.form.requirements = [...current, tag];
      }
    },

    buildRequirements() {
      const selected = Array.isArray(this.form.requirements) ? this.form.requirements : [];
      const custom = (this.form.customRequirement || "").trim();
      const merged = custom ? [...selected, custom] : [...selected];
      return Array.from(new Set(merged)).slice(0, 8);
    },

    buildDeadlineAt() {
      if (!this.form.deadlineDate || !this.form.deadlineTime) {
        return null;
      }

      const raw = `${this.form.deadlineDate} ${this.form.deadlineTime}`;
      const timestamp = new Date(raw.replace(/-/g, "/")).getTime();
      if (!timestamp || Number.isNaN(timestamp)) {
        return null;
      }
      return timestamp;
    },

    async submit() {
      const userStore = useUserStore();
      if (!userStore.isLogin) {
        uni.showToast({
          title: "请先登录",
          icon: "none"
        });
        return;
      }

      const profile = userStore.profile || {};
      if (!profile.userId) {
        uni.showToast({
          title: "登录信息异常，请重新登录",
          icon: "none"
        });
        return;
      }

      if (!this.form.title.trim()) {
        uni.showToast({ title: "请填写任务标题", icon: "none" });
        return;
      }

      const rewardNum = Number(this.form.reward);
      if (!this.form.reward || Number.isNaN(rewardNum) || rewardNum <= 0) {
        uni.showToast({ title: "请输入有效报酬", icon: "none" });
        return;
      }

      const deadlineAt = this.buildDeadlineAt();
      const timeText = this.form.time.trim() || (deadlineAt ? `${this.form.deadlineDate} ${this.form.deadlineTime}` : "");

      if (!timeText) {
        uni.showToast({ title: "请填写任务时间", icon: "none" });
        return;
      }

      if (!this.form.location.trim()) {
        uni.showToast({ title: "请填写任务地点", icon: "none" });
        return;
      }

      this.submitting = true;
      try {
        const requirements = this.buildRequirements();

        await publishTask({
          title: this.form.title,
          type: this.form.type,
          reward: this.form.reward,
          time: timeText,
          location: this.form.location,
          description: this.form.description,
          deadlineAt,
          requirements,
          isRecurring: this.form.isRecurring,
          recurringRule: this.form.isRecurring ? this.form.recurringRule : "",
          publisher: profile.nickName || "校园用户",
          publisherId: profile.userId
        });

        uni.showToast({
          title: "发布成功",
          icon: "success"
        });
        setTimeout(() => {
          uni.switchTab({
            url: "/pages/tasks/list"
          });
        }, 500);
      } catch (error) {
        uni.showToast({
          title: "发布失败",
          icon: "none"
        });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.publish-task-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 180rpx;
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
  top: -20rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.25), transparent 70%);
}
.orb-2 {
  width: 140rpx; height: 140rpx;
  top: 400rpx; left: -20rpx;
  background: radial-gradient(circle, rgba(250, 170, 50, 0.2), transparent 70%);
}

.header {
  position: relative;
  padding: 28rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.header-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.08), transparent);
  pointer-events: none;
}
.header-title {
  position: relative;
  font-size: 36rpx;
  font-weight: 800;
  color: #1a2540;
}
.header-desc {
  margin-top: 8rpx;
  color: #5a6a88;
  font-size: 24rpx;
}

.form {
  padding: 24rpx;
}

.quick-tip {
  margin-bottom: 14rpx;
  border-radius: 16rpx;
  padding: 14rpx 18rpx;
  background: linear-gradient(135deg, rgba(47, 107, 255, 0.06), rgba(47, 107, 255, 0.03));
  color: #2f6bff;
  font-size: 24rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border: 1rpx solid rgba(47, 107, 255, 0.1);
}
.quick-icon { font-size: 22rpx; }

.field + .field {
  margin-top: 20rpx;
}

.label {
  margin-bottom: 10rpx;
  color: #1a2540;
  font-size: 25rpx;
  font-weight: 600;
}

.switch-row {
  align-items: center;
  justify-content: space-between;
}

.label-inline {
  color: #293347;
  font-size: 25rpx;
}

.input,
.picker,
.textarea {
  background: rgba(238, 242, 251, 0.6);
  border-radius: 16rpx;
  padding: 0 20rpx;
  color: #2b3448;
  font-size: 26rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: border-color 0.2s ease;
}

.input,
.picker {
  height: 74rpx;
  line-height: 74rpx;
}

.textarea {
  width: auto;
  min-height: 170rpx;
  line-height: 1.6;
  padding-top: 12rpx;
}

.row {
  display: flex;
  gap: 12rpx;
}

.col {
  flex: 1;
}

.req-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.req-tag {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #5f708e;
  font-size: 24rpx;
  font-weight: 500;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: all 0.25s ease;
}

.req-tag.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4rpx 12rpx rgba(47, 107, 255, 0.25);
}

.req-input {
  margin-top: 12rpx;
}

.submit {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.3);
  z-index: 100;
}
.submit::after { border: none; }
</style>
