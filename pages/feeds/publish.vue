<template>
  <view class="publish-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">发布动态</view>
      <view class="banner-desc">分享你的校园生活</view>
    </view>

    <view class="form card anim-slide-up anim-d1">
      <view class="field">
        <text class="label">话题</text>
        <view class="tag-row">
          <text
            v-for="t in topics"
            :key="t"
            :class="['tag', form.topic === t ? 'active' : '']"
            @tap="form.topic = t"
          >{{ t }}</text>
        </view>
      </view>
      <view class="field">
        <text class="label">内容 *</text>
        <textarea v-model.trim="form.content" class="textarea" maxlength="500" placeholder="说点什么吧..." />
      </view>
      <view class="field">
        <text class="label">图片（最多9张）</text>
        <view class="image-row">
          <image
            v-for="(img, idx) in form.images"
            :key="idx"
            :src="img"
            class="preview-img"
            mode="aspectFill"
            @tap="removeImage(idx)"
          />
          <view v-if="form.images.length < 9" class="add-img" @tap="chooseImages">+</view>
        </view>
      </view>
    </view>

    <button class="submit-btn btn-bounce anim-slide-up anim-d2" :loading="submitting" @tap="submit">发布动态</button>
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
      if (!this.form.content) {
        uni.showToast({ title: "请输入内容", icon: "none" });
        return;
      }
      if (this.submitting) {
        return;
      }

      this.submitting = true;
      try {
        await publishFeed({
          content: this.form.content,
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
  padding: 24rpx; padding-bottom: 160rpx;
  background: radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.06), rgba(124, 58, 237, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(243, 238, 255, 0.96), rgba(250, 248, 255, 0.98)), #ffffff; border: 1rpx solid #e6dff8; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.form { margin-top: 14rpx; padding: 20rpx; }
.field { margin-bottom: 22rpx; }
.label { color: #33435f; font-size: 25rpx; font-weight: 600; display: block; margin-bottom: 10rpx; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.tag.active { background: #7c3aed; color: #fff; }
.textarea {
  width: 100%; min-height: 200rpx; padding: 16rpx 20rpx; border-radius: 16rpx;
  background: #f6f8fc; border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx; box-sizing: border-box;
}
.image-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.preview-img { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
.add-img {
  width: 160rpx; height: 160rpx; border-radius: 12rpx; background: #f0f2f8; border: 2rpx dashed #c8cfde;
  display: flex; align-items: center; justify-content: center; color: #8a93a7; font-size: 48rpx;
}
.submit-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: 40rpx; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #7c3aed, #6025c0);
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.submit-btn::after { border: none; }
</style>
