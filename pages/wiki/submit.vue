<template>
  <view class="submit-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">投稿维基</view>
      <view class="banner-desc">分享你的校园经验，帮助更多同学</view>
    </view>

    <view class="form card anim-slide-up anim-d1">
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
        uni.showToast({ title: "投稿失败", icon: "none" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.submit-page {
  padding: 24rpx; padding-bottom: 160rpx;
  background: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.06), rgba(16, 185, 129, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(232, 252, 244, 0.96), rgba(245, 255, 250, 0.98)), #ffffff; border: 1rpx solid #c8e8d8; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.form { margin-top: 14rpx; padding: 20rpx; }
.field { margin-bottom: 22rpx; }
.label { color: #33435f; font-size: 25rpx; font-weight: 600; display: block; margin-bottom: 10rpx; }
.input {
  height: 76rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f6f8fc;
  border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx;
}
.textarea {
  width: 100%; min-height: 300rpx; padding: 16rpx 20rpx; border-radius: 16rpx;
  background: #f6f8fc; border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx; box-sizing: border-box;
}
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.tag.active { background: #10b981; color: #fff; }
.submit-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: 40rpx; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.submit-btn::after { border: none; }
</style>
