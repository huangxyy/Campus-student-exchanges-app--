<template>
  <view v-if="visible" class="report-dialog-mask" @tap="close">
    <view class="report-dialog glass-strong anim-slide-up" @tap.stop>
      <view class="dialog-head">
        <view class="dialog-title-wrap">
          <text class="dialog-icon">!</text>
          <text class="dialog-title">举报</text>
        </view>
        <view class="close-btn press-able" @tap="close">
          <text class="close-icon">×</text>
        </view>
      </view>

      <view class="dialog-body">
        <view class="field-label">选择举报原因</view>
        <view class="reason-list">
          <text
            v-for="reason in reasons"
            :key="reason.value"
            :class="['reason-tag', form.reason === reason.value ? 'active' : '']"
            @tap="form.reason = reason.value"
          >
            {{ reason.label }}
          </text>
        </view>

        <view class="field-label mt">补充说明（可选）</view>
        <view class="textarea-wrap">
          <textarea
            v-model="form.detail"
            class="detail-input"
            placeholder="请提供更多细节，帮助我们快速处理"
            maxlength="200"
          />
          <text class="char-count">{{ (form.detail || "").length }}/200</text>
        </view>
      </view>

      <view class="dialog-foot">
        <button class="cancel-btn btn-bounce" @tap="close">取消</button>
        <button class="submit-btn btn-bounce" :loading="submitting" @tap="handleSubmit">提交举报</button>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { REPORT_REASONS, submitReport } from "@/utils/report-service";

export default {
  data() {
    return {
      visible: false,
      submitting: false,
      reasons: REPORT_REASONS,
      targetType: "",
      targetId: "",
      form: {
        reason: "",
        detail: ""
      }
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },
    isLogin() {
      return this.userStore.isLogin;
    }
  },

  methods: {
    open(targetType, targetId) {
      if (!this.isLogin) {
        uni.navigateTo({ url: "/pages/login/login" });
        return;
      }
      this.targetType = targetType;
      this.targetId = targetId;
      this.form.reason = "";
      this.form.detail = "";
      this.visible = true;
    },

    close() {
      if (this.submitting) return;
      this.visible = false;
    },

    async handleSubmit() {
      if (!this.form.reason) {
        uni.showToast({ title: "请选择举报原因", icon: "none" });
        return;
      }

      this.submitting = true;
      try {
        await submitReport({
          targetType: this.targetType,
          targetId: this.targetId,
          reason: this.form.reason,
          detail: this.form.detail
        });
        uni.showToast({ title: "举报已提交，感谢反馈", icon: "success" });
        this.visible = false;
      } catch (error) {
        uni.showToast({ title: error?.message || "提交失败，请重试", icon: "none" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.report-dialog-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(15, 20, 35, 0.5);
  backdrop-filter: blur(8rpx);
  -webkit-backdrop-filter: blur(8rpx);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.report-dialog {
  width: 100%;
  border-radius: 32rpx 32rpx 0 0 !important;
  padding-bottom: env(safe-area-inset-bottom);
}

.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid rgba(228, 235, 251, 0.5);
}

.dialog-title-wrap {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.dialog-icon {
  font-size: 28rpx;
  color: #e25269;
  font-weight: 700;
}

.dialog-title {
  color: #1a2540;
  font-size: 32rpx;
  font-weight: 700;
}

.close-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(238, 242, 251, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon {
  color: #6a7e9a;
  font-size: 32rpx;
}

.dialog-body {
  padding: 28rpx 32rpx;
}

.field-label {
  color: #1a2540;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.field-label.mt {
  margin-top: 28rpx;
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.reason-tag {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #5f708e;
  font-size: 24rpx;
  font-weight: 500;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: all 0.2s ease;
}

.reason-tag.active {
  background: rgba(226, 82, 105, 0.08);
  color: #e25269;
  border-color: rgba(226, 82, 105, 0.25);
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(226, 82, 105, 0.1);
}

.textarea-wrap {
  position: relative;
}

.detail-input {
  width: 100%;
  height: 160rpx;
  padding: 18rpx;
  background: rgba(238, 242, 251, 0.5);
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  border-radius: 18rpx;
  color: #2b3a56;
  font-size: 26rpx;
  box-sizing: border-box;
}

.char-count {
  position: absolute;
  right: 18rpx;
  bottom: 14rpx;
  font-size: 20rpx;
  color: #a7afbe;
}

.dialog-foot {
  padding: 16rpx 32rpx 32rpx;
  display: flex;
  gap: 14rpx;
}

.cancel-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  border: none;
  margin: 0;
  background: rgba(238, 242, 251, 0.7);
  color: #5f708e;
  font-size: 28rpx;
  font-weight: 600;
}

.cancel-btn::after {
  border: none;
}

.submit-btn {
  flex: 1.5;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  border: none;
  margin: 0;
  background: linear-gradient(135deg, #e25269, #c73248);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(226, 82, 105, 0.25);
}

.submit-btn::after {
  border: none;
}
</style>
