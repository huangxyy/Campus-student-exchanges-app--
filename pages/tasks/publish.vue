<template>
  <view class="publish-task-page">
    <view class="form card">
      <view v-if="quickMode" class="quick-tip">快递代取专区快速发单</view>

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

    <button class="submit" :loading="submitting" @tap="submit">发布任务</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { publishTask } from "@/utils/task-service";
import { addPoints } from "@/utils/points-service";

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

      if (!this.form.reward || Number(this.form.reward) <= 0) {
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

        const task = await publishTask({
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

        await addPoints("publish_task", task.id || "").catch(() => null);

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
  padding: 22rpx;
}

.form {
  padding: 22rpx;
}

.quick-tip {
  margin-bottom: 14rpx;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  background: #eef4ff;
  color: #2f6bff;
  font-size: 23rpx;
}

.field + .field {
  margin-top: 20rpx;
}

.label {
  margin-bottom: 10rpx;
  color: #293347;
  font-size: 25rpx;
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
  background: #f3f5fb;
  border-radius: 14rpx;
  padding: 0 16rpx;
  color: #273247;
  font-size: 25rpx;
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
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #eef2fa;
  color: #67758e;
  font-size: 23rpx;
}

.req-tag.active {
  background: #2f6bff;
  color: #fff;
}

.req-input {
  margin-top: 12rpx;
}

.submit {
  margin-top: 20rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  border: none;
  background: #2f6bff;
  color: #fff;
  font-size: 27rpx;
}
</style>
