<template>
  <view class="my-products-page">
    <empty-state
      v-if="!isLogin"
      title="请先登录"
      description="登录后可管理你发布的商品"
      action-text="去登录"
      @action="goLogin"
    />

    <template v-else>
      <view class="header card">
        <view class="count">我发布的商品：{{ total }} 件</view>
        <view class="header-actions">
          <button class="batch-btn" size="mini" @tap="toggleBatchMode">{{ batchMode ? "退出批量" : "批量管理" }}</button>
          <button class="publish-btn" size="mini" @tap="goPublish">+ 发布新商品</button>
        </view>
      </view>

      <view class="status-tabs">
        <text
          v-for="item in statuses"
          :key="item.value"
          :class="['tab', currentStatus === item.value ? 'active' : '']"
          @tap="selectStatus(item.value)"
        >
          {{ item.label }}
        </text>
      </view>

      <view v-if="loading && list.length === 0" class="loading">加载中...</view>

      <template v-else>
        <view v-for="item in filteredList" :key="item._id" class="product-item">
          <product-card :product="item" @click="goDetail(item._id)" />

          <view class="operator card">
            <view class="left-operator">
              <view class="status">状态：{{ getStatusText(item.status) }}</view>
              <view v-if="batchMode" :class="['selector', selectedIds.includes(item._id) ? 'active' : '']" @tap.stop="toggleSelect(item._id)">
                {{ selectedIds.includes(item._id) ? "已选" : "选择" }}
              </view>
            </view>
            <view class="buttons">
              <button
                v-if="!batchMode && item.status === 'available'"
                size="mini"
                class="op-btn"
                @tap.stop="handleChangeStatus(item, 'sold')"
              >
                标记售出
              </button>
              <button
                v-if="!batchMode && item.status === 'available'"
                size="mini"
                class="op-btn"
                @tap.stop="handleChangeStatus(item, 'deleted')"
              >
                下架
              </button>
              <button
                v-if="!batchMode && (item.status === 'sold' || item.status === 'deleted')"
                size="mini"
                class="op-btn"
                @tap.stop="handleChangeStatus(item, 'available')"
              >
                重新上架
              </button>
              <button v-if="!batchMode" size="mini" class="op-btn danger" @tap.stop="handleDelete(item)">删除</button>
            </view>
          </view>
        </view>

        <empty-state
          v-if="filteredList.length === 0 && !loading"
          title="还没有发布商品"
          description="先发一个闲置试试"
          action-text="去发布"
          @action="goPublish"
        />

        <view class="load-more-hint" v-if="filteredList.length > 0">
          <text v-if="loading">加载中...</text>
          <text v-else-if="noMore">没有更多了</text>
          <text v-else>上拉加载更多</text>
        </view>
      </template>

      <view v-if="batchMode" class="batch-toolbar">
        <view class="selected">已选择 {{ selectedIds.length }} 项</view>
        <view class="batch-actions">
          <button class="batch-op" size="mini" @tap="handleBatchDown">批量下架</button>
          <button class="batch-op danger" size="mini" @tap="handleBatchDelete">批量删除</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
import EmptyState from "@/components/empty-state/empty-state.vue";
import ProductCard from "@/components/product-card/product-card.vue";
import { useUserStore } from "@/store/user";
import { deleteProduct, queryProductsByUser, updateProductStatus } from "@/utils/product-service";

export default {
  components: {
    EmptyState,
    ProductCard
  },

  data() {
    return {
      loading: false,
      page: 1,
      pageSize: 10,
      total: 0,
      noMore: false,
      statuses: [
        { label: "全部", value: "all" },
        { label: "在售中", value: "available" },
        { label: "已售出", value: "sold" },
        { label: "已下架", value: "deleted" }
      ],
      currentStatus: "all",
      list: [],
      batchMode: false,
      selectedIds: []
    };
  },

  computed: {
    userStore() {
      return useUserStore();
    },

    isLogin() {
      return this.userStore.isLogin;
    },

    filteredList() {
      if (this.currentStatus === "all") {
        return this.list;
      }
      return this.list.filter((item) => item.status === this.currentStatus);
    }
  },

  onShow() {
    this.loadMyProducts({ reset: true });
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async loadMyProducts(options = {}) {
      const { reset = true } = options;

      if (!this.isLogin) {
        this.list = [];
        this.selectedIds = [];
        this.total = 0;
        return;
      }

      const profile = this.userStore.profile || {};
      if (!profile.userId) {
        this.list = [];
        uni.showToast({
          title: "登录信息异常，请重新登录",
          icon: "none"
        });
        return;
      }

      if (reset) {
        this.page = 1;
        this.noMore = false;
        this.list = [];
        this.selectedIds = [];
      } else if (this.noMore || this.loading) {
        return;
      }

      this.loading = true;
      try {
        const res = await queryProductsByUser(profile.userId, {
          page: this.page,
          pageSize: this.pageSize
        });
        this.list = reset ? res.list : [...this.list, ...res.list];
        this.total = res.total;
        this.noMore = res.noMore;
      } catch (error) {
        uni.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },

    loadMore() {
      if (this.loading || this.noMore) {
        return;
      }
      this.page += 1;
      this.loadMyProducts({ reset: false });
    },

    selectStatus(status) {
      this.currentStatus = status;
      this.selectedIds = [];
    },

    toggleBatchMode() {
      this.batchMode = !this.batchMode;
      this.selectedIds = [];
    },

    toggleSelect(productId) {
      if (!productId) {
        return;
      }

      if (this.selectedIds.includes(productId)) {
        this.selectedIds = this.selectedIds.filter((id) => id !== productId);
      } else {
        this.selectedIds = [...this.selectedIds, productId];
      }
    },

    async handleBatchDown() {
      if (this.selectedIds.length === 0) {
        uni.showToast({
          title: "请先选择商品",
          icon: "none"
        });
        return;
      }

      let successCount = 0;
      for (const id of this.selectedIds) {
        const target = this.list.find((item) => item._id === id);
        if (!target || target.status === "deleted") {
          continue;
        }
        const ok = await updateProductStatus(id, "deleted");
        if (ok) {
          successCount += 1;
        }
      }

      uni.showToast({
        title: successCount > 0 ? `已下架 ${successCount} 件` : "未成功下架",
        icon: successCount > 0 ? "success" : "none"
      });
      this.loadMyProducts();
    },

    handleBatchDelete() {
      if (this.selectedIds.length === 0) {
        uni.showToast({
          title: "请先选择商品",
          icon: "none"
        });
        return;
      }

      uni.showModal({
        title: "确认批量删除",
        content: `确定删除选中的 ${this.selectedIds.length} 件商品吗？`,
        success: async (res) => {
          if (!res.confirm) {
            return;
          }

          let successCount = 0;
          for (const id of this.selectedIds) {
            const ok = await deleteProduct(id);
            if (ok) {
              successCount += 1;
            }
          }

          uni.showToast({
            title: successCount > 0 ? `已删除 ${successCount} 件` : "删除失败",
            icon: successCount > 0 ? "success" : "none"
          });
          this.loadMyProducts();
        }
      });
    },

    goLogin() {
      uni.navigateTo({
        url: "/pages/login/login"
      });
    },

    goPublish() {
      uni.navigateTo({
        url: "/pages/products/publish"
      });
    },

    goDetail(id) {
      if (this.batchMode) {
        this.toggleSelect(id);
        return;
      }

      uni.navigateTo({
        url: `/pages/products/detail?id=${id}`
      });
    },

    getStatusText(status) {
      if (status === "available") {
        return "在售中";
      }
      if (status === "sold") {
        return "已售出";
      }
      if (status === "deleted") {
        return "已下架";
      }
      return "未知";
    },

    async handleChangeStatus(item, status) {
      const ok = await updateProductStatus(item._id, status);
      if (!ok) {
        uni.showToast({
          title: "状态更新失败",
          icon: "none"
        });
        return;
      }

      uni.showToast({
        title: `已更新为${this.getStatusText(status)}`,
        icon: "success"
      });
      this.loadMyProducts();
    },

    handleDelete(item) {
      uni.showModal({
        title: "确认删除",
        content: `确定删除商品“${item.title}”吗？`,
        success: async (res) => {
          if (!res.confirm) {
            return;
          }
          const ok = await deleteProduct(item._id);
          if (!ok) {
            uni.showToast({
              title: "删除失败",
              icon: "none"
            });
            return;
          }
          uni.showToast({
            title: "已删除",
            icon: "success"
          });
          this.loadMyProducts();
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.my-products-page {
  padding: 22rpx;
  padding-bottom: 130rpx;
}

.header {
  padding: 18rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.count {
  color: #2a3347;
  font-size: 26rpx;
  font-weight: 600;
}

.publish-btn {
  margin: 0;
  height: 60rpx;
  line-height: 60rpx;
  min-width: 180rpx;
  border: none;
  border-radius: 30rpx;
  background: #2f6bff;
  color: #fff;
  font-size: 23rpx;
}

.batch-btn {
  margin: 0;
  height: 60rpx;
  line-height: 60rpx;
  min-width: 170rpx;
  border: none;
  border-radius: 30rpx;
  background: #eef2fa;
  color: #3f4f6f;
  font-size: 23rpx;
}

.status-tabs {
  margin: 14rpx 0;
  display: flex;
  gap: 10rpx;
}

.tab {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #eef2fa;
  color: #69748b;
  font-size: 24rpx;
}

.tab.active {
  background: #2f6bff;
  color: #fff;
}

.loading {
  margin-top: 80rpx;
  text-align: center;
  color: #8e97a9;
  font-size: 24rpx;
}

.product-item {
  margin-bottom: 14rpx;
}

.operator {
  margin-top: -6rpx;
  padding: 14rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left-operator {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.status {
  color: #67748d;
  font-size: 23rpx;
}

.selector {
  min-width: 90rpx;
  height: 46rpx;
  line-height: 46rpx;
  text-align: center;
  border-radius: 23rpx;
  background: #eef2fa;
  color: #60718b;
  font-size: 21rpx;
}

.selector.active {
  background: #2f6bff;
  color: #fff;
}

.buttons {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.op-btn {
  margin: 0;
  min-width: 126rpx;
  height: 52rpx;
  line-height: 52rpx;
  border-radius: 26rpx;
  border: none;
  background: #edf2ff;
  color: #365bc2;
  font-size: 22rpx;
}

.op-btn.danger {
  background: #fbeef1;
  color: #d9536b;
}

.batch-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #e8edf5;
  padding: 14rpx 20rpx 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected {
  color: #5d6c88;
  font-size: 23rpx;
}

.batch-actions {
  display: flex;
  gap: 8rpx;
}

.batch-op {
  margin: 0;
  min-width: 130rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  border: none;
  background: #edf2ff;
  color: #365bc2;
  font-size: 22rpx;
}

.batch-op.danger {
  background: #fbeef1;
  color: #d9536b;
}

.load-more-hint {
  text-align: center;
  color: #8e97a9;
  font-size: 23rpx;
  padding: 30rpx 0 20rpx;
}
</style>
