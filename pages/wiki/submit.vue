<template>
  <view class="submit-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-title">📖 投稿维基</view>
      <view class="banner-desc">分享你的校园经验，帮助更多同学</view>
    </view>

    <view class="form glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
      <view class="field">
        <text class="label">标题 *</text>
        <input v-model.trim="form.title" class="input" maxlength="60" placeholder="例如：图书馆使用完全指南" />
      </view>
      <view class="field">
        <text class="label">分类</text>
        <view class="tag-row">
          <text
            v-for="cat in categories"
            :key="cat"
            :class="['tag', form.category === cat ? 'active' : '']"
            @tap="form.category = cat"
          >{{ cat }}</text>
        </view>
      </view>
      <view class="field">
        <text class="label">摘要</text>
        <input v-model.trim="form.summary" class="input" maxlength="100" placeholder="一句话概括文章要点" />
      </view>
      <view class="field">
        <text class="label">正文 *</text>
        <textarea v-model.trim="form.content" class="textarea" maxlength="5000" placeholder="详细写下你的经验分享..." />
      </view>
    </view>

    <button class="submit-btn btn-bounce anim-slide-up anim-d2" :loading="submitting" @tap="submit">提交投稿</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { submitArticle } from "@/utils/wiki-service";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      form: {
        title: "",
        summary: "",
        content: "",
        category: "其他"
      },
      categories: ["新生指南", "学习攻略", "生活技巧", "校园设施", "其他"],
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
    async submit() {
      if (!this.form.title) {
        uni.showToast({ title: "请填写标题", icon: "none" });
        return;
      }
      if (!this.form.content) {
        uni.showToast({ title: "请填写正文", icon: "none" });
        return;
      }
      if (this.submitting) { return; }

      this.submitting = true;
      try {
        await submitArticle({
          title: this.form.title,
          summary: this.form.summary,
          content: this.form.content,
          category: this.form.category
        });
        uni.showToast({ title: "投稿成功，待审核", icon: "success" });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (error) {
        showError(error, { title: "投稿失败" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.submit-page {
  position: relative;
  padding: 24rpx; padding-bottom: 180rpx;
  min-height: 100vh;
  overflow: hidden;
  background: $page-bg;
}
.page-orbs { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; overflow: hidden; }
.orb { position: absolute; border-radius: 50%; filter: blur(40rpx); opacity: 0.45; }
.orb-1 { width: 160rpx; height: 160rpx; top: -20rpx; right: -30rpx; background: radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%); }

.banner { position: relative; padding: 28rpx; margin-bottom: 16rpx; overflow: hidden; }
.banner-deco {
  position: absolute; top: -50rpx; right: -30rpx; width: 180rpx; height: 180rpx; border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent); pointer-events: none;
}
.banner-title { position: relative; color: #1a2540; font-size: 36rpx; font-weight: 800; }
.banner-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; }

.form { padding: 24rpx; }
.field { margin-bottom: 22rpx; }
.label { color: #1a2540; font-size: 26rpx; font-weight: 600; display: block; margin-bottom: 10rpx; }
.input {
  height: 76rpx; padding: 0 20rpx; border-radius: 16rpx;
  background: rgba(238, 242, 251, 0.6); border: 1rpx solid rgba(228, 235, 251, 0.5);
  color: #2b3448; font-size: 26rpx; transition: border-color 0.2s ease;
}
.textarea {
  width: 100%; min-height: 300rpx; padding: 16rpx 20rpx; border-radius: 16rpx;
  background: rgba(238, 242, 251, 0.6); border: 1rpx solid rgba(228, 235, 251, 0.5);
  color: #2b3448; font-size: 26rpx; box-sizing: border-box; line-height: 1.7;
}
.tag-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag {
  padding: 12rpx 22rpx; border-radius: 999rpx;
  background: rgba(238, 242, 251, 0.7); color: #5f708e; font-size: 24rpx; font-weight: 600;
  border: 1rpx solid rgba(228, 235, 251, 0.5); transition: all 0.25s ease;
}
.tag.active {
  background: linear-gradient(135deg, #10b981, #059669); color: #fff;
  border-color: transparent; box-shadow: 0 4rpx 14rpx rgba(16, 185, 129, 0.3);
}
.submit-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: calc(40rpx + env(safe-area-inset-bottom));
  height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-size: 30rpx; font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(16, 185, 129, 0.3); z-index: 100;
}
.submit-btn::after { border: none; }
</style>
