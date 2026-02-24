<template>
  <view class="products-page">
    <view class="market-hero glass-strong anim-slide-down" style="border-radius: 28rpx;">
      <view class="hero-deco"></view>
      <view class="hero-title">🛒 校园好物市场</view>
      <view class="hero-sub">支持价格、成色、地图位置多维筛选，帮你更快找到目标商品</view>
      <view class="hero-pills">
        <text class="hero-pill">{{ total }} 件在售</text>
        <text class="hero-pill">{{ sortBy === "distance" ? "距离优先" : "智能排序" }}</text>
        <text class="hero-pill" v-if="advanced.nearbyEnabled">已定位</text>
      </view>
    </view>

    <view class="toolbar glass-strong anim-scale-in anim-d1" style="border-radius: 24rpx;">
      <view class="search-row">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索商品标题或描述"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <button class="search-btn btn-bounce" @tap="handleSearch">查找</button>
      </view>

      <scroll-view scroll-x class="category-scroll">
        <view
          v-for="item in categories"
          :key="item.value"
          :class="['category-item', category === item.value ? 'active' : '']"
          @tap="selectCategory(item.value)"
        >
          {{ item.label }}
        </view>
      </scroll-view>

      <view class="sort-row">
        <text :class="['sort-item', sortBy === 'time' ? 'active' : '']" @tap="changeSort('time')">最新</text>
        <text :class="['sort-item', sortBy === 'price' ? 'active' : '']" @tap="changeSort('price')">价格</text>
        <text :class="['sort-item', sortBy === 'views' ? 'active' : '']" @tap="changeSort('views')">热度</text>
        <text :class="['sort-item', sortBy === 'distance' ? 'active' : '']" @tap="changeSort('distance')">最近</text>
        <text class="filter-toggle" @tap="toggleAdvanced">
          {{ showAdvanced ? "收起筛选" : "高级筛选" }}
        </text>
      </view>

      <view v-if="showAdvanced" class="advanced-panel">
        <view class="panel-title">价格区间</view>
        <view class="price-input-row">
          <input v-model="advanced.priceMin" class="mini-input" type="digit" placeholder="最低价" />
          <text class="separator">-</text>
          <input v-model="advanced.priceMax" class="mini-input" type="digit" placeholder="最高价" />
        </view>

        <view class="panel-title">成色</view>
        <view class="chip-row">
          <text
            v-for="item in conditionOptions"
            :key="item"
            :class="['filter-chip', advanced.conditions.includes(item) ? 'active' : '']"
            @tap="toggleCondition(item)"
          >
            {{ item }}
          </text>
        </view>

        <view class="panel-title">交易地点</view>
        <view class="chip-row">
          <text
            v-for="item in locationOptions"
            :key="item"
            :class="['filter-chip', advanced.locations.includes(item) ? 'active' : '']"
            @tap="toggleLocation(item)"
          >
            {{ item }}
          </text>
        </view>

        <view class="panel-title">地图选点</view>
        <view class="map-row">
          <button class="panel-btn ghost" size="mini" @tap="chooseMapAnchor">选择位置</button>
          <button v-if="advanced.nearbyEnabled" class="panel-btn ghost" size="mini" @tap="clearMapAnchor">清除位置</button>
        </view>
        <view v-if="advanced.nearbyEnabled" class="anchor-info">{{ advanced.anchorName || "已选位置" }}</view>
        <view v-if="advanced.nearbyEnabled" class="chip-row">
          <text
            v-for="item in nearbyDistanceOptions"
            :key="item"
            :class="['filter-chip', Number(advanced.nearbyDistanceKm) === Number(item) ? 'active' : '']"
            @tap="setNearbyDistance(item)"
          >
            附近 {{ item }}km
          </text>
        </view>

        <view class="panel-actions">
          <button class="panel-btn ghost" size="mini" @tap="resetAdvanced">重置</button>
          <button class="panel-btn" size="mini" @tap="applyAdvanced">应用筛选</button>
        </view>
      </view>
    </view>

    <view class="result-info anim-fade-in anim-d2">
      <text>共 {{ total }} 件商品</text>
      <text v-if="activeFilterCount > 0" class="filter-count">（已启用 {{ activeFilterCount }} 项筛选）</text>
      <text v-if="advanced.nearbyEnabled" class="filter-count">（按地图位置筛选）</text>
    </view>

    <view v-if="list.length > 0">
      <product-card
        v-for="(item, index) in list"
        :key="item._id"
        :product="item"
        :class="['anim-stagger-fade', 'anim-d' + (index % 10 + 1)]"
        @click="goDetail(item._id)"
      />

      <view class="bottom-tip">
        <text v-if="loading">加载中...</text>
        <text v-else-if="noMore">没有更多了</text>
      </view>
    </view>

    <empty-state
      v-else-if="!loading"
      title="没找到匹配商品"
      description="可以换个关键词，或者先发布一个"
      action-text="去发布"
      @action="goPublish"
    />

    <view class="float-btn anim-scale-in anim-d3 anim-glow" @tap="goPublish">发布</view>
  </view>
</template>

<script>
import ProductCard from "@/components/product-card/product-card.vue";
import EmptyState from "@/components/empty-state/empty-state.vue";
import { productCategories } from "@/utils/mock-products";
import { queryProducts } from "@/utils/product-service";
import { useUserStore } from "@/store/user";

export default {
  components: {
    ProductCard,
    EmptyState
  },

  data() {
    return {
      keyword: "",
      category: "all",
      categories: productCategories,
      sortBy: "time",
      showAdvanced: false,
      advanced: {
        priceMin: "",
        priceMax: "",
        conditions: [],
        locations: [],
        nearbyEnabled: false,
        nearbyDistanceKm: 1,
        anchorName: "",
        anchorLatitude: null,
        anchorLongitude: null
      },
      conditionOptions: ["95新", "9成新", "8成新", "7成新及以下"],
      locationOptions: ["图书馆", "教学楼", "宿舍", "食堂", "操场", "快递站"],
      nearbyDistanceOptions: [0.5, 1, 2, 3, 5],
      page: 1,
      pageSize: 6,
      total: 0,
      list: [],
      loading: false,
      noMore: false
    };
  },

  computed: {
    activeFilterCount() {
      let count = 0;
      if (this.advanced.priceMin || this.advanced.priceMax) {
        count += 1;
      }
      if (this.advanced.conditions.length > 0) {
        count += 1;
      }
      if (this.advanced.locations.length > 0) {
        count += 1;
      }
      if (this.advanced.nearbyEnabled) {
        count += 1;
      }
      return count;
    }
  },

  onLoad() {
    this.loadProducts({ reset: true });
  },

  onPullDownRefresh() {
    this.loadProducts({ reset: true }).finally(() => {
      uni.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    this.loadMore();
  },

  methods: {
    async loadProducts(options = {}) {
      const { reset = false } = options;

      if (this.loading) {
        return;
      }

      if (reset) {
        this.page = 1;
        this.noMore = false;
        this.list = [];
      } else if (this.noMore) {
        return;
      }

      this.loading = true;

      try {
        const filters = this.buildQueryFilters();
        const res = await queryProducts({
          keyword: this.keyword,
          category: this.category,
          sortBy: this.sortBy,
          page: this.page,
          pageSize: this.pageSize,
          filters
        });

        this.total = res.total;
        this.list = reset ? res.list : [...this.list, ...res.list];
        this.noMore = res.noMore;
      } catch (error) {
        uni.showToast({
          title: "加载商品失败",
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
      this.loadProducts();
    },

    buildQueryFilters() {
      return {
        priceMin: this.advanced.priceMin,
        priceMax: this.advanced.priceMax,
        conditions: this.advanced.conditions,
        locations: this.advanced.locations,
        nearbyEnabled: this.advanced.nearbyEnabled,
        nearbyDistanceKm: this.advanced.nearbyDistanceKm,
        anchorLatitude: this.advanced.anchorLatitude,
        anchorLongitude: this.advanced.anchorLongitude
      };
    },

    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced;
    },

    toggleCondition(value) {
      if (this.advanced.conditions.includes(value)) {
        this.advanced.conditions = this.advanced.conditions.filter((item) => item !== value);
      } else {
        this.advanced.conditions = [...this.advanced.conditions, value];
      }
    },

    toggleLocation(value) {
      if (this.advanced.locations.includes(value)) {
        this.advanced.locations = this.advanced.locations.filter((item) => item !== value);
      } else {
        this.advanced.locations = [...this.advanced.locations, value];
      }
    },

    chooseMapAnchor() {
      uni.getSetting({
        success: (settingRes) => {
          const locationAuth = settingRes.authSetting?.["scope.userLocation"];
          if (locationAuth === false) {
            this.showLocationPermissionGuide('附近筛选需要获取你的位置信息，请在设置中开启「位置信息」权限。');
            return;
          }
          this.doChooseMapAnchor();
        },
        fail: () => {
          this.doChooseMapAnchor();
        }
      });
    },

    doChooseMapAnchor() {
      uni.chooseLocation({
        success: (res) => {
          this.advanced.nearbyEnabled = true;
          this.advanced.anchorName = res.name || res.address || "已选位置";
          this.advanced.anchorLatitude = res.latitude;
          this.advanced.anchorLongitude = res.longitude;
          this.applyAdvanced();
        },
        fail: (error) => {
          const message = String(error?.errMsg || "");
          if (message.includes("cancel")) {
            return;
          }

          if (message.includes("auth deny") || message.includes("auth denied")) {
            this.showLocationPermissionGuide("定位权限已被拒绝。开启后即可使用地图选点筛选附近商品。");
            return;
          }

          uni.showToast({
            title: "地图位置选择失败，请稍后重试",
            icon: "none"
          });
        }
      });
    },

    showLocationPermissionGuide(content) {
      uni.showModal({
        title: "开启定位权限",
        content,
        confirmText: "去设置",
        cancelText: "暂不开启",
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          uni.openSetting({
            success: (settingRes) => {
              const enabled = !!settingRes.authSetting?.["scope.userLocation"];
              if (enabled) {
                uni.showToast({ title: "权限已开启，请重新选点", icon: "success" });
                setTimeout(() => { this.doChooseMapAnchor(); }, 600);
              } else {
                uni.showToast({ title: "权限未开启，无法使用附近筛选", icon: "none" });
              }
            }
          });
        }
      });
    },

    clearMapAnchor() {
      this.advanced.nearbyEnabled = false;
      this.advanced.anchorName = "";
      this.advanced.anchorLatitude = null;
      this.advanced.anchorLongitude = null;
      if (this.sortBy === "distance") {
        this.sortBy = "time";
      }
      this.loadProducts({ reset: true });
    },

    setNearbyDistance(distanceKm) {
      this.advanced.nearbyDistanceKm = distanceKm;
      this.applyAdvanced();
    },

    resetAdvanced() {
      this.advanced = {
        priceMin: "",
        priceMax: "",
        conditions: [],
        locations: [],
        nearbyEnabled: false,
        nearbyDistanceKm: 1,
        anchorName: "",
        anchorLatitude: null,
        anchorLongitude: null
      };
      this.loadProducts({ reset: true });
    },

    applyAdvanced() {
      const min = Number(this.advanced.priceMin);
      const max = Number(this.advanced.priceMax);
      if (this.advanced.priceMin && this.advanced.priceMax && Number.isFinite(min) && Number.isFinite(max) && min > max) {
        uni.showToast({
          title: "价格区间不正确",
          icon: "none"
        });
        return;
      }

      if (
        this.advanced.nearbyEnabled &&
        (typeof this.advanced.anchorLatitude !== "number" || typeof this.advanced.anchorLongitude !== "number")
      ) {
        uni.showToast({
          title: "请先选择地图位置",
          icon: "none"
        });
        return;
      }

      this.loadProducts({ reset: true });
    },

    handleSearch() {
      this.loadProducts({ reset: true });
    },

    selectCategory(value) {
      if (this.category === value) {
        return;
      }
      this.category = value;
      this.loadProducts({ reset: true });
    },

    changeSort(type) {
      if (this.sortBy === type) {
        return;
      }

      if (type === "distance" && !this.advanced.nearbyEnabled) {
        uni.showToast({
          title: "请先在高级筛选中选择地图位置",
          icon: "none"
        });
        return;
      }

      this.sortBy = type;
      this.loadProducts({ reset: true });
    },

    goDetail(id) {
      uni.navigateTo({
        url: `/pages/products/detail?id=${id}`
      });
    },

    goPublish() {
      const userStore = useUserStore();
      if (!userStore.isLogin) {
        uni.navigateTo({
          url: "/pages/login/login"
        });
        return;
      }

      uni.navigateTo({
        url: "/pages/products/publish"
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.products-page {
  position: relative;
  padding: 24rpx;
  padding-bottom: 140rpx;
  min-height: 100vh;
  background: $page-bg;
}

.market-hero {
  position: relative;
  padding: 28rpx;
  overflow: hidden;
  margin-bottom: 4rpx;
}
.hero-deco {
  position: absolute; top: -50rpx; right: -30rpx; width: 200rpx; height: 200rpx; border-radius: 50%;
  background: radial-gradient(circle, rgba(47, 107, 255, 0.1), transparent); pointer-events: none;
}

.hero-title {
  position: relative;
  color: #1a2540;
  font-size: 36rpx;
  font-weight: 800;
}

.hero-sub {
  margin-top: 8rpx;
  color: #5f6f8d;
  font-size: 23rpx;
  line-height: 1.5;
}

.hero-pills {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.hero-pill {
  height: 42rpx;
  line-height: 42rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid #dfe8fb;
  color: #5570a4;
  font-size: 21rpx;
}

.toolbar {
  margin-top: 14rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  border-radius: 22rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(31, 38, 66, 0.04);
}

.search-row {
  display: flex;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 76rpx;
  border-radius: 38rpx;
  background: #f5f7fd;
  border: 1rpx solid #edf1fa;
  padding: 0 24rpx;
  font-size: 26rpx;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.search-input:focus {
  border-color: rgba(47, 107, 255, 0.25);
  box-shadow: 0 0 0 4rpx rgba(47, 107, 255, 0.06);
}

.search-btn {
  margin: 0;
  width: 130rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 38rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #2760de);
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.25);
}

.category-scroll {
  margin-top: 16rpx;
  white-space: nowrap;
}

.category-item {
  display: inline-block;
  margin-right: 12rpx;
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #eff3fc;
  color: #5f6d84;
  font-size: 24rpx;
}

.category-item.active {
  background: linear-gradient(135deg, #2f6bff, #2158d2);
  color: #fff;
}

.sort-row {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.sort-item {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #eef2fb;
  color: #66758f;
  font-size: 23rpx;
}

.sort-item.active {
  background: #dfe9ff;
  color: #265fd8;
  font-weight: 700;
}

.filter-toggle {
  height: 52rpx;
  line-height: 52rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: #2f6bff;
  color: #fff;
  font-size: 22rpx;
}

.advanced-panel {
  margin-top: 14rpx;
  border-radius: 16rpx;
  padding: 16rpx;
  background: #f6f9ff;
  border: 1rpx solid #e3eaf9;
}

.panel-title {
  color: #45516a;
  font-size: 23rpx;
  margin-top: 10rpx;
}

.panel-title:first-child {
  margin-top: 0;
}

.price-input-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.mini-input {
  flex: 1;
  height: 62rpx;
  line-height: 62rpx;
  border-radius: 12rpx;
  background: #ffffff;
  border: 1rpx solid #e2e8f7;
  padding: 0 14rpx;
  font-size: 24rpx;
}

.separator {
  color: #8591a5;
  font-size: 24rpx;
}

.chip-row {
  margin-top: 10rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.map-row {
  margin-top: 10rpx;
  display: flex;
  gap: 8rpx;
}

.anchor-info {
  margin-top: 10rpx;
  color: #5e6f8d;
  font-size: 22rpx;
  line-height: 1.5;
}

.filter-chip {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #eaf0fd;
  color: #66758f;
  font-size: 22rpx;
}

.filter-chip.active {
  background: #2f6bff;
  color: #fff;
}

.panel-actions {
  margin-top: 14rpx;
  display: flex;
  justify-content: flex-end;
  gap: 8rpx;
}

.panel-btn {
  margin: 0;
  min-width: 120rpx;
  height: 52rpx;
  line-height: 52rpx;
  border-radius: 28rpx;
  border: none;
  background: linear-gradient(135deg, #2f6bff, #275fd7);
  color: #fff;
  font-size: 22rpx;
}

.panel-btn.ghost {
  background: #e9edf8;
  color: #53627f;
}

.result-info {
  margin: 16rpx 4rpx;
  min-height: 58rpx;
  border-radius: 14rpx;
  padding: 0 16rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6rpx;
  color: #6f7d96;
  font-size: 23rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid #e7ecf8;
}

.filter-count {
  color: #5b6b88;
}

.bottom-tip {
  text-align: center;
  color: #9aa2b3;
  font-size: 24rpx;
  margin: 24rpx 0 120rpx;
}

.float-btn {
  position: fixed;
  right: 28rpx;
  bottom: 120rpx;
  min-width: 160rpx;
  height: 92rpx;
  border-radius: 46rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #2f6bff, #1f53ce);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  box-shadow:
    0 8rpx 20rpx rgba(47, 107, 255, 0.3),
    0 20rpx 40rpx rgba(47, 107, 255, 0.15);
  z-index: 99;
}
</style>
