<template>
  <view class="my-want-page">
    <view class="banner glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="banner-deco"></view>
      <view class="banner-title">🔍 我的求购</view>
      <view class="banner-desc">管理你发布的求购信息</view>
    </view>

    <empty-state
      v-if="list.length === 0 && !loading"
      title="还没有求购"
      description="去求购广场发布你想要的商品"
      action-text="发布求购"
      @action="goPublish"
    />

    <view
      v-for="(item, idx) in list"
      :key="item.id"
      :class="['want-card', 'glass-strong', 'card-press', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 1)) : '']"
      style="border-radius: 22rpx;"
    >
      <view class="want-head">
        <view class="want-title">{{ item.title }}</view>
        <text :class="['status-tag', item.status === 'active' ? 'active' : 'closed']">
          {{ item.status === 'active' ? (isExpired(item) ? '已过期' : '有效') : '已关闭' }}
        </text>
      </view>
      <view class="want-meta">
        <text class="want-category">{{ item.category }}</text>
        <text v-if="item.priceMax" class="want-price">¥{{ item.priceMin || 0 }}~{{ item.priceMax }}</text>
        <text class="want-time">{{ formatTime(item.createdAt) }}</text>
      </view>
      <view class="want-foot">
        <text class="match-count">匹配 {{ item.matchCount }} 次</text>
        <button
          v-if="item.status === 'active' && !isExpired(item)"
          class="close-btn"
          size="mini"
          @tap="handleClose(item)"
        >关闭求购</button>
      </view>
    </view>

    <view v-if="loading" class="loading-text">加载中...</view>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import { formatRelativeTime } from "@/utils/date";
import { getMyWants, closeWant } from "@/utils/want-service";
import { showError } from "@/utils/error-handler";

export default {
  components: { EmptyState },

  data() {
    return {
      list: [],
      loading: false
    };
  },

  onShow() {
    this.loadList();
  },

  methods: {
    formatTime(ts) { return formatRelativeTime(ts); },

    isExpired(item) {
      return item.validUntil && Date.now() > Number(item.validUntil);
    },

    async loadList() {
      this.loading = true;
      try {
        this.list = await getMyWants();
      } catch (error) {
        this.list = [];
        showError(error, { title: "加载失败" });
      } finally {
        this.loading = false;
      }
    },

    async handleClose(item) {
      uni.showModal({
        title: "关闭求购",
        content: "关闭后将不再展示在求购广场，是否继续？",
        success: async (res) => {
          if (!res.confirm) {
            return;
          }
          const ok = await closeWant(item.id);
          if (ok) {
            uni.showToast({ title: "已关闭", icon: "none" });
            this.loadList();
          } else {
            showError("UNKNOWN", { title: "操作失败" });
          }
        }
      });
    },

    goPublish() {
      uni.navigateTo({ url: "/pages/want/publish" });
    }
  }
};
</script>

<style lang="scss" scoped>
.my-want-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 120rpx;
  min-height: 100vh;
  background: $page-bg;
}
.banner {
  position: relative;
  padding: 24rpx;
  margin-bottom: 4rpx;
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
.banner-title { position: relative; color: #1a2540; font-size: 34rpx; font-weight: 800; }
.banner-desc { margin-top: 8rpx; color: #5a6a88; font-size: 24rpx; }
.want-card { margin-top: 14rpx; padding: 22rpx; }
.want-head { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.want-title { color: #1f2430; font-size: 29rpx; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-tag { font-size: 20rpx; border-radius: 999rpx; padding: 4rpx 12rpx; flex-shrink: 0; }
.status-tag.active { background: #e8f7ef; color: #238a57; }
.status-tag.closed { background: #f4f5f8; color: #7d879b; }
.want-meta { margin-top: 10rpx; display: flex; align-items: center; gap: 12rpx; color: #8a93a7; font-size: 22rpx; }
.want-category { background: #f0e8ff; color: #7b5ec6; border-radius: 999rpx; padding: 4rpx 12rpx; font-size: 20rpx; }
.want-price { color: #e74a62; font-size: 22rpx; }
.want-foot { margin-top: 12rpx; display: flex; align-items: center; justify-content: space-between; }
.match-count { color: #6e7b92; font-size: 22rpx; }
.close-btn {
  margin: 0; height: 52rpx; line-height: 52rpx; border-radius: 26rpx; border: none;
  background: linear-gradient(135deg, #fceff1, #ffe8ec); color: #e74a62; font-size: 23rpx; padding: 0 22rpx; font-weight: 600;
}
.close-btn::after { border: none; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
