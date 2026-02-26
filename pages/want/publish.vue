<template>
  <view class="publish-page">
    <view class="page-orbs">
      <view class="orb orb-1 anim-float"></view>
      <view class="orb orb-2 anim-float-x"></view>
    </view>

    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-title">🔍 发布求购</view>
      <view class="banner-desc">描述你想要的商品，让卖家主动联系你</view>
    </view>

    <view class="form glass-strong anim-slide-up anim-d1" style="border-radius: 24rpx;">
      <view class="field">
        <text class="label">标题 *</text>
        <input v-model.trim="form.title" class="input" maxlength="40" placeholder="例如：求一本高数课本" />
      </view>
      <view class="field">
        <text class="label">描述</text>
        <textarea v-model.trim="form.description" class="textarea" maxlength="200" placeholder="补充说明你想要的规格、新旧程度等" />
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
        <text class="label">预算范围（元）</text>
        <view class="price-row">
          <input v-model="form.priceMin" class="price-input" type="digit" placeholder="最低" />
          <text class="price-sep">~</text>
          <input v-model="form.priceMax" class="price-input" type="digit" placeholder="最高" />
        </view>
      </view>
      <view class="field">
        <text class="label">有效天数</text>
        <view class="tag-row">
          <text
            v-for="opt in validDays"
            :key="opt.value"
            :class="['tag', form.validDaysValue === opt.value ? 'active' : '']"
            @tap="form.validDaysValue = opt.value"
          >{{ opt.label }}</text>
        </view>
      </view>
    </view>

    <button class="submit-btn btn-bounce anim-slide-up anim-d2" :loading="submitting" @tap="submit">发布求购</button>
  </view>
</template>

<script>
import { useUserStore } from "@/store/user";
import { publishWant } from "@/utils/want-service";
import { showError } from "@/utils/error-handler";

export default {
  data() {
    return {
      form: {
        title: "",
        description: "",
        category: "其他",
        priceMin: "",
        priceMax: "",
        validDaysValue: 7
      },
      categories: ["数码", "书籍", "生活", "服饰", "其他"],
      validDays: [
        { label: "3天", value: 3 },
        { label: "7天", value: 7 },
        { label: "14天", value: 14 },
        { label: "30天", value: 30 }
      ],
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
      if (this.submitting) {
        return;
      }

      const priceMin = Number(this.form.priceMin || 0);
      const priceMax = Number(this.form.priceMax || 0);
      if (Number.isNaN(priceMin) || Number.isNaN(priceMax)) {
        uni.showToast({ title: "请输入有效的预算金额", icon: "none" });
        return;
      }
      if (priceMin < 0 || priceMax < 0) {
        uni.showToast({ title: "预算金额不能为负数", icon: "none" });
        return;
      }
      if (priceMax > 0 && priceMin > priceMax) {
        uni.showToast({ title: "最低价不能高于最高价", icon: "none" });
        return;
      }

      const validUntil = Date.now() + this.form.validDaysValue * 24 * 60 * 60 * 1000;

      this.submitting = true;
      try {
        await publishWant({
          title: this.form.title,
          description: this.form.description,
          category: this.form.category,
          priceMin,
          priceMax,
          validUntil
        });
        uni.showToast({ title: "发布成功", icon: "success" });
        setTimeout(() => uni.navigateBack(), 500);
      } catch (error) {
        showError(error, { title: "发布失败，请重试" });
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
  padding-bottom: 160rpx;
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
  width: 160rpx; height: 160rpx;
  top: -20rpx; right: -30rpx;
  background: radial-gradient(circle, rgba(255, 139, 62, 0.25), transparent 70%);
}
.orb-2 {
  width: 120rpx; height: 120rpx;
  top: 400rpx; left: -20rpx;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.2), transparent 70%);
}

.banner {
  position: relative;
  padding: 24rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.banner-deco {
  position: absolute;
  top: -50rpx; right: -30rpx;
  width: 180rpx; height: 180rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 139, 62, 0.08), transparent);
  pointer-events: none;
}
.banner-title { position: relative; color: #1f2636; font-size: 36rpx; font-weight: 800; }
.banner-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; }
.form { margin-top: 14rpx; padding: 20rpx; }
.field { margin-bottom: 22rpx; }
.label { color: #33435f; font-size: 25rpx; font-weight: 600; display: block; margin-bottom: 10rpx; }
.input {
  height: 76rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f6f8fc;
  border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx;
}
.textarea {
  width: 100%; min-height: 160rpx; padding: 16rpx 20rpx; border-radius: 16rpx;
  background: #f6f8fc; border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx; box-sizing: border-box;
}
.tag-row { display: flex; flex-wrap: wrap; gap: 10rpx; }
.tag {
  padding: 10rpx 20rpx; border-radius: 999rpx; background: #eef2fb; color: #68748d; font-size: 22rpx;
}
.tag.active { background: #ff8b3e; color: #fff; }
.price-row { display: flex; align-items: center; gap: 10rpx; }
.price-input {
  flex: 1; height: 76rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f6f8fc;
  border: 1rpx solid #e5ebf8; color: #2b3345; font-size: 26rpx; text-align: center;
}
.price-sep { color: #8a93a7; font-size: 26rpx; }
.submit-btn {
  position: fixed; left: 24rpx; right: 24rpx; bottom: calc(40rpx + env(safe-area-inset-bottom)); height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff; font-size: 30rpx; font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(241, 113, 45, 0.3);
  z-index: 100;
}
.submit-btn::after { border: none; }
</style>
