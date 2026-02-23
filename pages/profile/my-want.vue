<template>
  <view class="my-want-page">
    <view class="banner card anim-slide-down">
      <view class="banner-title">我的求购</view>
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
      :class="['want-card', 'card', 'card-press', 'anim-slide-up', idx < 8 ? ('anim-d' + (idx + 1)) : '']"
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
        uni.showToast({ title: "加载失败", icon: "none" });
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
            uni.showToast({ title: "操作失败", icon: "none" });
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
  padding: 24rpx;
  padding-bottom: 120rpx;
  background: radial-gradient(circle at 50% 0%, rgba(255, 139, 62, 0.06), rgba(255, 139, 62, 0) 60%), #f2f5fb;
}
.banner { padding: 22rpx; background: linear-gradient(140deg, rgba(255, 248, 238, 0.96), rgba(255, 252, 248, 0.98)), #ffffff; border: 1rpx solid #f5e3cc; }
.banner-title { color: #1f2636; font-size: 34rpx; font-weight: 700; }
.banner-desc { margin-top: 8rpx; color: #647188; font-size: 24rpx; }
.want-card { margin-top: 12rpx; padding: 20rpx; }
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
  margin: 0; height: 48rpx; line-height: 48rpx; border-radius: 24rpx; border: none;
  background: #ffeef1; color: #e74a62; font-size: 22rpx; padding: 0 20rpx;
}
.close-btn::after { border: none; }
.loading-text { margin-top: 40rpx; text-align: center; color: #8b95ab; font-size: 24rpx; }
</style>
