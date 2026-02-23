<template>
  <view class="publish-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="header glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="header-deco"></view>
      <view class="header-title">✏️ 发布动态</view>
      <view class="header-desc">分享你的校园生活</view>
    </view>

    <view class="form-container anim-slide-up anim-d1">
      <view class="form-section glass-strong" style="border-radius: 24rpx;">
        <view class="section-header">
          <text class="section-title">选择话题</text>
        </view>
        <view class="topic-row">
          <view
            v-for="t in topics"
            :key="t"
            :class="['topic-tag', form.topic === t ? 'active' : '']"
            @tap="form.topic = t"
          >
            {{ t }}
          </view>
        </view>
      </view>

      <view class="form-section glass-strong anim-slide-up anim-d2" style="border-radius: 24rpx;">
        <view class="section-header">
          <text class="section-title">动态内容</text>
        </view>
        <view class="textarea-wrapper">
          <textarea 
            v-model.trim="form.content" 
            class="content-textarea" 
            maxlength="500" 
            placeholder="这一刻的想法..." 
            placeholder-class="textarea-placeholder"
          />
          <view class="word-count">{{ form.content.length }}/500</view>
        </view>
      </view>

      <view class="form-section glass-strong anim-slide-up anim-d3" style="border-radius: 24rpx;">
        <view class="section-header">
          <text class="section-title">添加图片</text>
          <text class="section-subtitle">{{ form.images.length }}/9</text>
        </view>
        <view class="image-grid">
          <view
            v-for="(img, idx) in form.images"
            :key="idx"
            class="image-wrapper"
          >
            <image :src="img" class="preview-img" mode="aspectFill" />
            <view class="remove-btn" @tap="removeImage(idx)">
              <text class="remove-icon">×</text>
            </view>
          </view>
          
          <view v-if="form.images.length < 9" class="add-image-btn press-able" @tap="chooseImages">
            <text class="add-icon">+</text>
            <text class="add-text">添加</text>
          </view>
        </view>
      </view>
    </view>

    <view class="footer-container">
      <view class="footer-bar glass-strong" style="border-radius: 28rpx 28rpx 0 0;">
        <button 
          :class="['submit-btn', 'btn-bounce', form.content.trim() ? 'active' : '']" 
          :loading="submitting" 
          @tap="submit"
        >
          发布动态
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { publishFeed } from "@/utils/feed-service";

export default {
  data() {
    return {
      form: {
        content: "",
        topic: "闲聊",
        images: []
      },
      topics: ["闲聊", "学习", "美食", "运动", "吐槽", "求助"],
      submitting: false
    };
  },

  computed: {
    userStore() { return useUserStore(); },
    isLogin() { return this.userStore.isLogin; }
  },

  onLoad() {
    if (!this.isLogin) {
      uni.showToast({ title: "请先登录", icon: "none" });
      setTimeout(() => uni.navigateTo({ url: "/pages/login/login" }), 300);
    }
  },

  methods: {
    chooseImages() {
      const maxCount = 9 - this.form.images.length;
      uni.chooseImage({
        count: maxCount,
        sizeType: ["compressed"],
        success: (res) => {
          this.form.images = [...this.form.images, ...(res.tempFilePaths || [])].slice(0, 9);
        }
      });
    },

    removeImage(idx) {
      this.form.images.splice(idx, 1);
    },

    async submit() {
      if (!this.form.content.trim()) {
        uni.showToast({ title: "请输入内容", icon: "none" });
        return;
      }
      if (this.submitting) {
        return;
      }

      this.submitting = true;
      try {
        await publishFeed({
          content: this.form.content.trim(),
          topic: this.form.topic,
          images: this.form.images
        });
        uni.showToast({ title: "发布成功", icon: "success" });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (error) {
        uni.showToast({ title: "发布失败", icon: "none" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.publish-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
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
  background: radial-gradient(circle, rgba(124, 58, 237, 0.25), transparent 70%);
}
.orb-2 {
  width: 140rpx; height: 140rpx;
  top: 400rpx; left: -20rpx;
  background: radial-gradient(circle, rgba(19, 194, 163, 0.2), transparent 70%);
}

/* Header */
.header {
  position: relative;
  padding: 28rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}
.header-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.08), transparent);
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

/* Form */
.form-container {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.form-section {
  padding: 24rpx;
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: flex-end;
  gap: 12rpx;
  margin-bottom: 18rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2540;
}
.section-subtitle {
  font-size: 24rpx;
  color: #8a95ac;
  margin-bottom: 1rpx;
}

/* Topic Tags */
.topic-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.topic-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14rpx 34rpx;
  background: rgba(238, 242, 251, 0.7);
  color: #5f708e;
  font-size: 26rpx;
  font-weight: 600;
  border-radius: 999rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: all 0.25s ease;
}
.topic-tag.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 6rpx 16rpx rgba(47, 107, 255, 0.25);
  transform: translateY(-2rpx);
}

/* Textarea */
.textarea-wrapper {
  position: relative;
  background: rgba(238, 242, 251, 0.5);
  border-radius: 20rpx;
  padding: 20rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.5);
  transition: all 0.2s ease;
}
.content-textarea {
  width: 100%;
  height: 260rpx;
  font-size: 28rpx;
  color: #1a2540;
  line-height: 1.65;
}
.textarea-placeholder { color: #a7afbe; }
.word-count {
  position: absolute;
  right: 20rpx; bottom: 20rpx;
  font-size: 22rpx;
  color: #a7afbe;
}

/* Image Grid */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}
.image-wrapper {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(26, 38, 66, 0.06);
}
.preview-img {
  width: 100%; height: 100%;
  background-color: #eef2fb;
}
.remove-btn {
  position: absolute;
  top: 10rpx; right: 10rpx;
  width: 40rpx; height: 40rpx;
  background: rgba(226, 82, 105, 0.85);
  backdrop-filter: blur(4rpx);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.remove-icon {
  color: #FFFFFF;
  font-size: 28rpx;
  line-height: 1;
}

.add-image-btn {
  aspect-ratio: 1 / 1;
  background: rgba(238, 242, 251, 0.7);
  border: 2rpx dashed rgba(47, 107, 255, 0.2);
  border-radius: 18rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
.add-icon {
  font-size: 48rpx;
  color: #7a8eb5;
  font-weight: 300;
}
.add-text {
  font-size: 20rpx;
  color: #8a95ac;
}

/* Footer */
.footer-container {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 100;
}
.footer-bar {
  padding: 24rpx 28rpx calc(24rpx + env(safe-area-inset-bottom));
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(238, 242, 251, 0.7);
  color: #8a95ac;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 44rpx;
  border: none;
  transition: all 0.3s ease;
}
.submit-btn.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.3);
}
.submit-btn::after { border: none; }
</style>
