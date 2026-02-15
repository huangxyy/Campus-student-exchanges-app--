<template>
  <view class="publish-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">发布求购</view>
      <view class="banner-desc">描述你想要的商品，让卖家主动联系你</view>
    </view>

    <view class="form card anim-slide-up anim-d1">
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
        uni.showToast({ title: "发布失败，请重试", icon: "none" });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.publish-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  background: radial-gradient(circle at 50% 0%, rgba(255, 139, 62, 0.06), rgba(255, 139, 62, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(255, 248, 238, 0.96), rgba(255, 252, 248, 0.98)), #ffffff; border: 1rpx solid #f5e3cc; }
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
  position: fixed; left: 24rpx; right: 24rpx; bottom: 40rpx; height: 88rpx; line-height: 88rpx;
  border-radius: 44rpx; border: none; background: linear-gradient(135deg, #ff8b3e, #f1712d);
  color: #fff; font-size: 30rpx; font-weight: 600;
}
.submit-btn::after { border: none; }
</style>
