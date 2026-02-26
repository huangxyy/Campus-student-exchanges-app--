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

    <view class="section card anim-slide-up anim-d4">
      <view class="section-title">匹配到你的新商品</view>
      <view class="section-desc">新上架且符合你订阅的商品会出现在这里</view>
      <view v-if="alertsLoading" class="alerts-loading">加载中...</view>
      <view v-else-if="arrivalAlerts.length === 0" class="alerts-empty">暂无新匹配</view>
      <view
        v-else
        v-for="a in arrivalAlerts"
        :key="a.id"
        :class="['alert-row', a.read ? 'read' : '']"
        @tap="openAlert(a)"
      >
        <view class="alert-main">
          <text class="alert-title">{{ a.productTitle }}</text>
          <text class="alert-meta">¥{{ a.productPrice }} · {{ a.productCategory || '其他' }}</text>
        </view>
        <text class="alert-arrow">></text>
      </view>
    </view>

    <button class="save-btn btn-bounce anim-slide-up anim-d5" :loading="saving" @tap="save">保存设置</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { getSubscription, updateSubscription, getArrivalAlerts, markArrivalAlertRead } from "@/utils/want-service";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      form: {
        enabled: true,
        categories: []
      },
      keywordsText: "",
      allCategories: ["数码", "书籍", "生活", "服饰", "其他"],
      saving: false,
      arrivalAlerts: [],
      alertsLoading: false
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
    this.loadAlerts();
  },

  onShow() {
    if (this.isLogin) {
      this.loadAlerts();
    }
  },

  methods: {
    async loadAlerts() {
      if (!this.isLogin) return;
      this.alertsLoading = true;
      try {
        this.arrivalAlerts = await getArrivalAlerts().catch(() => []);
      } finally {
        this.alertsLoading = false;
      }
    },

    async openAlert(a) {
      if (!a.productId) return;
      await markArrivalAlertRead(a.id).catch(() => false);
      const idx = this.arrivalAlerts.findIndex((x) => x.id === a.id);
      if (idx >= 0) {
        this.arrivalAlerts.splice(idx, 1, { ...this.arrivalAlerts[idx], read: true });
      }
      uni.navigateTo({ url: `/pages/products/detail?id=${a.productId}` });
    },
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
        showError(error, { title: "保存失败" });
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
.section-desc { margin-top: 6rpx; color: #8a96a8; font-size: 22rpx; }
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag { padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx; }
.tag.active { background: #ff8b3e; color: #fff; }
.input {
  height: 76rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f6f8fc;
  border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx;
}
.alerts-loading, .alerts-empty { padding: 24rpx 0; color: #8a96a8; font-size: 24rpx; text-align: center; }
.alert-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20rpx 0; border-bottom: 1rpx solid #eef2fb;
}
.alert-row:last-child { border-bottom: none; }
.alert-row.read .alert-title { color: #8a96a8; }
.alert-main { flex: 1; min-width: 0; }
.alert-title { display: block; color: #1f2636; font-size: 28rpx; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.alert-meta { display: block; margin-top: 6rpx; color: #647188; font-size: 22rpx; }
.alert-arrow { color: #c0c8d4; font-size: 24rpx; margin-left: 12rpx; }
.save-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: 40rpx; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.save-btn::after { border: none; }
</style>
