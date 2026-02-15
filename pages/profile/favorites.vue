<template>
  <view class="favorites-page">
    <empty-state
      v-if="!isLogin"
      title="请先登录"
      description="登录后可查看收藏商品"
      action-text="去登录"
      @action="goLogin"
    />

    <template v-else>
      <view class="header card">
        <view class="count">已收藏 {{ list.length }} 件商品</view>
      </view>

      <view v-if="loading" class="loading">加载中...</view>

      <template v-else>
        <view v-for="item in list" :key="item._id" class="favorite-item">
          <product-card :product="item" @click="goDetail(item._id)" />
          <view class="operator card">
            <button class="remove-btn" size="mini" @tap="handleRemove(item)">取消收藏</button>
          </view>
        </view>

        <empty-state
          v-if="list.length === 0"
          title="还没有收藏商品"
          description="在商品详情页点击收藏后会出现在这里"
        />
      </template>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import ProductCard from "@/components/product-card/product-card.vue";
import { useUserStore } from "@/store/user";
import { listFavorites, removeFavorite } from "@/utils/favorite-service";

export default {
  components: {
    EmptyState,
    ProductCard
  },

  data() {
    return {
      loading: false,
      list: []
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    }
  },

  onShow() {
    this.loadFavorites();
  },

  methods: {
    async loadFavorites() {
      if (!this.isLogin) {
        this.list = [];
        return;
      }
      this.loading = true;
      try {
        this.list = await listFavorites();
      } catch (error) {
        this.list = [];
      } finally {
        this.loading = false;
      }
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    },

    goDetail(id) {
      uni.navigateTo({
        url: `/pages/products/detail?id=${id}`
      });
    },

    async handleRemove(item) {
      const ok = await removeFavorite(item._id);
      if (!ok) {
        uni.showToast({
          title: "取消失败",
          icon: "none"
        });
        return;
      }
      uni.showToast({
        title: "已取消收藏",
        icon: "none"
      });
      this.loadFavorites();
    }
  }
};
</script>

<style lang="scss" scoped>
.favorites-page {
  padding: 22rpx;
}

.header {
  padding: 18rpx 20rpx;
}

.count {
  color: #2a3448;
  font-size: 26rpx;
  font-weight: 600;
}

.loading {
  margin-top: 80rpx;
  text-align: center;
  color: #8c95a8;
  font-size: 24rpx;
}

.favorite-item {
  margin-top: 12rpx;
}

.operator {
  margin-top: -6rpx;
  padding: 12rpx 16rpx;
  display: flex;
  justify-content: flex-end;
}

.remove-btn {
  margin: 0;
  min-width: 140rpx;
  height: 52rpx;
  line-height: 52rpx;
  border-radius: 26rpx;
  border: none;
  background: #fbeef1;
  color: #d5536a;
  font-size: 22rpx;
}
</style>
