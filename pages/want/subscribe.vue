<template>
  <view class="subscribe-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">到货提醒</view>
      <view class="banner-desc">设置关注的分类和关键词，新上架商品匹配时提醒你</view>
    </view>

    <view class="section card anim-slide-up anim-d1">
      <view class="section-title">开启提醒</view>
      <switch :checked="form.enabled" @change="form.enabled = $event.detail.value" color="#ff8b3e" />
    </view>

    <view class="section card anim-slide-up anim-d2">
      <view class="section-title">关注分类</view>
      <view class="tag-row">
        <text
          v-for="cat in allCategories"
          :key="cat"
          :class="['tag', form.categories.includes(cat) ? 'active' : '']"
          @tap="toggleCategory(cat)"
        >{{ cat }}</text>
      </view>
    </view>

    <view class="section card anim-slide-up anim-d3">
      <view class="section-title">关键词（逗号分隔）</view>
      <input v-model.trim="keywordsText" class="input" placeholder="例如：高数课本, 无线鼠标" />
    </view>

    <button class="save-btn btn-bounce anim-slide-up anim-d4" :loading="saving" @tap="save">保存设置</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { getSubscription, updateSubscription } from "@/utils/want-service";

export default {
  data() {
    return {
      form: {
        enabled: true,
        categories: []
      },
      keywordsText: "",
      allCategories: ["数码", "书籍", "生活", "服饰", "其他"],
      saving: false
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
      return;
    }
    this.loadSubscription();
  },

  methods: {
    toggleCategory(cat) {
      const idx = this.form.categories.indexOf(cat);
      if (idx >= 0) {
        this.form.categories.splice(idx, 1);
      } else {
        this.form.categories.push(cat);
      }
    },

    async loadSubscription() {
      const sub = await getSubscription().catch(() => null);
      if (sub) {
        this.form.enabled = sub.enabled !== false;
        this.form.categories = sub.categories || [];
        this.keywordsText = (sub.keywords || []).join(", ");
      }
    },

    async save() {
      if (this.saving) {
        return;
      }

      const keywords = this.keywordsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);

      this.saving = true;
      try {
        await updateSubscription({
          enabled: this.form.enabled,
          categories: this.form.categories,
          keywords
        });
        uni.showToast({ title: "保存成功", icon: "success" });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (error) {
        uni.showToast({ title: "保存失败", icon: "none" });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.subscribe-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  background: radial-gradient(circle at 50% 0%, rgba(255, 139, 62, 0.06), rgba(255, 139, 62, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(255, 248, 238, 0.96), rgba(255, 252, 248, 0.98)), #ffffff; border: 1rpx solid #f5e3cc; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.section { margin-top: 14rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 14rpx; }
.section-title { color: #33435f; font-size: 25rpx; font-weight: 600; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.tag.active { background: #ff8b3e; color: #fff; }
.input {
  height: 76rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f6f8fc;
  border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx;
}
.save-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: 40rpx; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.save-btn::after { border: none; }
</style>
