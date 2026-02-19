<template>
  <view class="publish-page">
    <view class="form card">
      <view class="mode-row">
        <text :class="['mode-item', publishMode === 'quick' ? 'active' : '']" @tap="setPublishMode('quick')">极简发布</text>
        <text :class="['mode-item', publishMode === 'detail' ? 'active' : '']" @tap="setPublishMode('detail')">详细发布</text>
      </view>

      <view v-if="publishMode === 'quick'" class="template-row">
        <text
          v-for="item in quickTemplates"
          :key="item.title"
          class="template-chip"
          @tap="applyQuickTemplate(item)"
        >
          {{ item.label }}
        </text>
      </view>

      <view class="field">
        <view class="label">商品标题</view>
        <input v-model="formData.title" class="input" maxlength="40" placeholder="例如：95新无线鼠标" />
      </view>

      <view class="field">
        <view class="label">商品分类</view>
        <picker :range="categoryLabels" @change="onCategoryChange">
          <view class="picker">{{ currentCategoryLabel }}</view>
        </picker>
      </view>

      <view class="field">
        <view class="label">成色</view>
        <picker :range="conditionOptions" @change="onConditionChange">
          <view class="picker">{{ formData.condition }}</view>
        </picker>
      </view>

      <view class="field">
        <view class="label">商品描述</view>
        <textarea
          v-model="formData.description"
          class="textarea"
          maxlength="300"
          placeholder="描述成色、配件、使用情况、交易方式"
        ></textarea>
      </view>

      <view class="field price-row">
        <view class="price-item">
          <view class="label">售价（元）</view>
          <input v-model="formData.price" class="input" type="digit" placeholder="0.00" />
        </view>
        <view v-if="publishMode === 'detail'" class="price-item">
          <view class="label">原价（元）</view>
          <input v-model="formData.originalPrice" class="input" type="digit" placeholder="可选" />
        </view>
      </view>

      <view class="field">
        <view class="label">交易地点</view>
        <view class="location-row">
          <input v-model="formData.location" class="input location-input" maxlength="30" placeholder="例如：图书馆门口" />
          <button class="map-pick-btn" size="mini" @tap="pickLocationFromMap">地图选点</button>
        </view>
        <view v-if="formData.locationAddress" class="location-tip">{{ formData.locationAddress }}</view>
      </view>

      <template v-if="publishMode === 'detail'">
        <view class="field">
          <view class="label">学院标签（可选）</view>
          <input v-model="formData.collegeTag" class="input" maxlength="20" placeholder="例如：计算机学院" />
        </view>

        <view class="field certified-row">
          <view class="label-inline">认证学生身份</view>
          <switch :checked="formData.certified" color="#2f6bff" @change="onCertifiedChange" />
        </view>

        <view class="field">
          <view class="label">标签（可选，空格分隔）</view>
          <input v-model="formData.tagInput" class="input" maxlength="60" placeholder="如：自用 无拆修 可刀" />
        </view>
      </template>

      <view class="field">
        <view class="label">商品图片（最多9张）</view>
        <view class="drag-hint">拖拽调整排序，第一张默认为封面</view>

        <movable-area v-if="images.length > 0" class="drag-area" :style="{ height: dragAreaHeight }">
          <movable-view
            v-for="(img, index) in images"
            :key="`${img}-${index}`"
            :class="['image-item', draggingIndex === index ? 'dragging' : '']"
            direction="all"
            :x="dragPositions[index] ? dragPositions[index].x : 0"
            :y="dragPositions[index] ? dragPositions[index].y : 0"
            :inertia="false"
            :damping="40"
            :friction="2"
            @touchstart="onDragStart(index)"
            @change="onDragChange($event, index)"
            @touchend="onDragEnd(index)"
          >
            <image :src="img" mode="aspectFill" class="preview" />
            <view v-if="index === 0" class="cover-badge">封面</view>
            <view class="remove" @tap.stop="removeImage(index)">×</view>
            <view class="image-tools">
              <text class="tool" @tap.stop="setCover(index)">设为封面</text>
            </view>
          </movable-view>
        </movable-area>

        <view v-if="images.length < 9" class="upload" @tap="chooseImages">+ 添加图片</view>
      </view>
    </view>

    <view class="actions">
      <button class="ai-btn" :loading="aiLoading" @tap="generateWithAI">
        {{ aiLoading ? "生成中..." : "AI生成文案" }}
      </button>
      <button class="submit-btn" :loading="submitting" @tap="submitPublish">发布商品</button>
    </view>
  </view>
</template>

<script>
import { productCategories } from "@/utils/mock-products";
import { useUserStore } from "@/store/user";
import { publishProduct } from "@/utils/product-service";
import { findMatchingWants } from "@/utils/want-service";

export default {
  data() {
    return {
      publishMode: "quick",
      categoryIndex: 0,
      categories: productCategories.filter((item) => item.value !== "all"),
      conditionOptions: ["95新", "9成新", "8成新", "7成新及以下"],
      quickTemplates: [
        {
          label: "教材转让",
          title: "教材低价转让",
          category: "books",
          description: "教材保存良好，笔记少，适合本学期课程使用。",
          condition: "9成新"
        },
        {
          label: "数码闲置",
          title: "数码闲置出",
          category: "electronics",
          description: "自用闲置，功能正常，支持当面验货。",
          condition: "95新"
        },
        {
          label: "宿舍好物",
          title: "宿舍好物转让",
          category: "daily",
          description: "宿舍整理出闲置，校内自提方便。",
          condition: "9成新"
        }
      ],
      images: [],
      dragCols: 4,
      dragItemSize: 0,
      dragGap: 0,
      dragPositions: [],
      draggingIndex: -1,
      dragStartPoint: { x: 0, y: 0 },
      dragCurrentPoint: { x: 0, y: 0 },
      dragMoved: false,
      aiLoading: false,
      submitting: false,
      formData: {
        title: "",
        category: "books",
        condition: "9成新",
        description: "",
        price: "",
        originalPrice: "",
        location: "",
        locationAddress: "",
        latitude: null,
        longitude: null,
        collegeTag: "",
        certified: false,
        tagInput: ""
      }
    };
  },

  computed: {
    categoryLabels() {
      return this.categories.map((item) => item.label);
    },

    currentCategoryLabel() {
      const target = this.categories.find((item) => item.value === this.formData.category);
      return target ? target.label : "请选择分类";
    },

    dragAreaHeight() {
      if (this.images.length === 0) {
        return `${this.dragItemSize || 0}px`;
      }
      const rows = Math.ceil(this.images.length / this.dragCols);
      const itemSize = this.dragItemSize || 0;
      const gap = this.dragGap || 0;
      return `${rows * itemSize + Math.max(0, rows - 1) * gap}px`;
    }
  },

  onLoad() {
    this.initDragMetrics();

    const userStore = useUserStore();
    if (!userStore.isLogin) {
      uni.showModal({
        title: "需要先登录",
        content: "发布商品前请先登录账号",
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({
              url: "/pages/login/login"
            });
          }
        }
      });
    }
  },

  methods: {
    setPublishMode(mode) {
      this.publishMode = mode;
      if (mode === "quick") {
        this.formData.originalPrice = "";
        this.formData.collegeTag = "";
        this.formData.certified = false;
        this.formData.tagInput = "";
      }
    },

    applyQuickTemplate(template) {
      if (!template) {
        return;
      }

      this.formData.title = template.title;
      this.formData.category = template.category;
      this.formData.description = template.description;
      this.formData.condition = template.condition;

      const index = this.categories.findIndex((item) => item.value === template.category);
      if (index >= 0) {
        this.categoryIndex = index;
      }
    },

    onCategoryChange(event) {
      const index = Number(event.detail.value || 0);
      if (!this.categories[index]) {
        return;
      }
      this.categoryIndex = index;
      this.formData.category = this.categories[index].value;
    },

    onConditionChange(event) {
      const index = Number(event.detail.value || 0);
      this.formData.condition = this.conditionOptions[index] || this.conditionOptions[0];
    },

    onCertifiedChange(event) {
      this.formData.certified = !!event.detail.value;
    },

    pickLocationFromMap() {
      uni.getSetting({
        success: (settingRes) => {
          const locationAuth = settingRes.authSetting?.["scope.userLocation"];
          if (locationAuth === false) {
            this.showLocationGuide("地图选点需要定位权限，请前往设置开启。");
            return;
          }
          this.doPickLocation();
        },
        fail: () => {
          this.doPickLocation();
        }
      });
    },

    doPickLocation() {
      uni.chooseLocation({
        success: (res) => {
          this.formData.location = res.name || res.address || this.formData.location;
          this.formData.locationAddress = res.address || "";
          this.formData.latitude = res.latitude;
          this.formData.longitude = res.longitude;
        },
        fail: (error) => {
          const message = String(error?.errMsg || "");
          if (message.includes("cancel")) {
            return;
          }

          if (message.includes("auth deny") || message.includes("auth denied")) {
            this.showLocationGuide("定位权限已被拒绝。开启后即可使用地图选点填写交易地点。");
            return;
          }

          uni.showToast({
            title: "地图选点失败，请稍后重试",
            icon: "none"
          });
        }
      });
    },

    showLocationGuide(content) {
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
                setTimeout(() => { this.doPickLocation(); }, 600);
              } else {
                uni.showToast({ title: "权限未开启", icon: "none" });
              }
            }
          });
        }
      });
    },

    initDragMetrics() {
      this.dragItemSize = Math.round(uni.upx2px(146));
      this.dragGap = Math.round(uni.upx2px(12));
      this.syncDragPositions();
    },

    getGridPositionByIndex(index) {
      const step = this.dragItemSize + this.dragGap;
      return {
        x: (index % this.dragCols) * step,
        y: Math.floor(index / this.dragCols) * step
      };
    },

    syncDragPositions() {
      this.dragPositions = this.images.map((_, index) => this.getGridPositionByIndex(index));
    },

    getNearestIndexByPoint(x, y) {
      const step = this.dragItemSize + this.dragGap;
      if (!step || this.images.length === 0) {
        return 0;
      }

      const col = Math.round(x / step);
      const row = Math.round(y / step);
      const maxCol = this.dragCols - 1;
      const maxRow = Math.ceil(this.images.length / this.dragCols) - 1;
      const safeCol = Math.min(maxCol, Math.max(0, col));
      const safeRow = Math.min(maxRow, Math.max(0, row));
      const nextIndex = safeRow * this.dragCols + safeCol;
      return Math.min(this.images.length - 1, Math.max(0, nextIndex));
    },

    onDragStart(index) {
      this.draggingIndex = index;
      const pos = this.dragPositions[index] || { x: 0, y: 0 };
      this.dragStartPoint = { x: pos.x, y: pos.y };
      this.dragCurrentPoint = { x: pos.x, y: pos.y };
      this.dragMoved = false;
    },

    onDragChange(event, index) {
      if (index !== this.draggingIndex) {
        return;
      }
      this.dragCurrentPoint = {
        x: event.detail.x,
        y: event.detail.y
      };
      if (!this.dragMoved) {
        const dx = Math.abs(this.dragCurrentPoint.x - this.dragStartPoint.x);
        const dy = Math.abs(this.dragCurrentPoint.y - this.dragStartPoint.y);
        const threshold = Math.round(uni.upx2px(20));
        if (dx > threshold || dy > threshold) {
          this.dragMoved = true;
        }
      }
    },

    onDragEnd(index) {
      if (index !== this.draggingIndex) {
        return;
      }

      if (this.dragMoved) {
        const targetIndex = this.getNearestIndexByPoint(this.dragCurrentPoint.x, this.dragCurrentPoint.y);
        if (targetIndex !== index) {
          const next = [...this.images];
          const [moving] = next.splice(index, 1);
          next.splice(targetIndex, 0, moving);
          this.images = next;
        }
      }

      this.draggingIndex = -1;
      this.dragMoved = false;
      this.dragCurrentPoint = { x: 0, y: 0 };
      this.$nextTick(() => {
        this.syncDragPositions();
      });
    },

    chooseImages() {
      const maxCount = 9 - this.images.length;
      uni.chooseImage({
        count: maxCount,
        sizeType: ["compressed"],
        success: (res) => {
          const files = res.tempFilePaths || [];
          this.images = [...this.images, ...files].slice(0, 9);
          this.$nextTick(() => {
            this.syncDragPositions();
          });
        }
      });
    },

    removeImage(index) {
      this.draggingIndex = -1;
      this.images.splice(index, 1);
      this.$nextTick(() => {
        this.syncDragPositions();
      });
    },

    setCover(index) {
      if (index < 0 || index >= this.images.length || index === 0) {
        return;
      }
      this.draggingIndex = -1;
      const next = [...this.images];
      const [target] = next.splice(index, 1);
      next.unshift(target);
      this.images = next;
      this.$nextTick(() => {
        this.syncDragPositions();
      });
    },

    buildTags() {
      const base = String(this.formData.tagInput || "")
        .split(/\s+|,|，/)
        .map((item) => item.trim())
        .filter(Boolean);
      return Array.from(new Set(base)).slice(0, 8);
    },

    async generateWithAI() {
      if (this.images.length === 0) {
        uni.showToast({
          title: "请先上传至少一张图片",
          icon: "none"
        });
        return;
      }

      this.aiLoading = true;
      try {
        const categoryText = this.currentCategoryLabel;
        await new Promise((resolve) => setTimeout(resolve, 900));

        if (!this.formData.title) {
          this.formData.title = `${categoryText}好物低价转`;
        }

        this.formData.description = `【AI建议文案】\n${categoryText}类商品，成色较好，功能正常，日常使用无压力。\n适合同校同学自提，价格可小刀，欢迎私聊了解细节。`;

        uni.showToast({
          title: "AI文案已生成",
          icon: "success"
        });
      } catch (error) {
        uni.showToast({
          title: "AI生成失败",
          icon: "none"
        });
      } finally {
        this.aiLoading = false;
      }
    },

    async submitPublish() {
      const userStore = useUserStore();
      if (!userStore.isLogin) {
        uni.showToast({ title: "请先登录", icon: "none" });
        return;
      }

      const profile = userStore.profile || {};
      if (!profile.userId) {
        uni.showToast({ title: "登录信息异常，请重新登录", icon: "none" });
        return;
      }

      if (!this.formData.title.trim()) {
        uni.showToast({ title: "请填写标题", icon: "none" });
        return;
      }

      const finalDescription =
        this.formData.description.trim() ||
        (this.publishMode === "quick" ? `${this.formData.title.trim()}，成色良好，支持校内当面交易。` : "");
      if (!finalDescription) {
        uni.showToast({ title: "请填写描述", icon: "none" });
        return;
      }

      if (!this.formData.price) {
        uni.showToast({ title: "请填写售价", icon: "none" });
        return;
      }

      if (this.images.length === 0) {
        uni.showToast({ title: "请上传至少一张图片", icon: "none" });
        return;
      }

      const priceNum = Number(this.formData.price);
      if (Number.isNaN(priceNum) || priceNum <= 0) {
        uni.showToast({ title: "售价格式不正确", icon: "none" });
        return;
      }

      const finalLocation = this.formData.location.trim() || (this.publishMode === "quick" ? "校内自提" : "");
      if (!finalLocation) {
        uni.showToast({ title: "请填写交易地点", icon: "none" });
        return;
      }

      const tags = this.buildTags();

      this.submitting = true;
      try {
        await publishProduct({
          title: this.formData.title,
          category: this.formData.category,
          condition: this.formData.condition,
          description: finalDescription,
          price: this.formData.price,
          originalPrice: this.publishMode === "detail" ? this.formData.originalPrice : "",
          location: finalLocation,
          locationAddress: this.formData.locationAddress,
          latitude: this.formData.latitude,
          longitude: this.formData.longitude,
          tags,
          collegeTag: this.publishMode === "detail" ? this.formData.collegeTag.trim() : "",
          certified: this.publishMode === "detail" ? this.formData.certified : false,
          images: this.images,
          userId: profile.userId,
          userName: profile.nickName || "校园用户",
          userAvatar: profile.avatar || "https://picsum.photos/seed/default-avatar/120/120",
          aiGenerated: finalDescription.includes("【AI建议文案】")
        });

        this.submitting = false;

        const matches = await findMatchingWants({
          title: this.formData.title,
          category: this.formData.category,
          price: priceNum
        }).catch(() => []);

        if (matches.length > 0) {
          uni.showModal({
            title: "匹配到求购需求",
            content: `有 ${matches.length} 位同学正在找类似商品，发布成功后可在求购广场查看并联系他们。`,
            confirmText: "去看看",
            cancelText: "稍后再说",
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.redirectTo({ url: "/pages/want/list" });
              } else {
                uni.redirectTo({ url: "/pages/profile/my-products" });
              }
            }
          });
        } else {
          uni.showToast({ title: "发布成功", icon: "success" });
          setTimeout(() => {
            uni.redirectTo({ url: "/pages/profile/my-products" });
          }, 700);
        }
      } catch (error) {
        this.submitting = false;
        uni.showToast({
          title: "发布失败，请重试",
          icon: "none"
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.publish-page {
  padding: 22rpx;
  padding-bottom: 180rpx;
  background:
    radial-gradient(circle at 10% 5%, rgba(47, 107, 255, 0.08), rgba(47, 107, 255, 0) 45%),
    radial-gradient(circle at 90% 20%, rgba(19, 194, 163, 0.06), rgba(19, 194, 163, 0) 40%),
    #f2f5fc;
}

.form {
  padding: 28rpx;
  border-radius: 26rpx;
  background: #ffffff;
  border: 1rpx solid rgba(228, 235, 251, 0.7);
  box-shadow: 0 6rpx 24rpx rgba(31, 38, 66, 0.05);
}

.mode-row {
  display: flex;
  gap: 10rpx;
  padding: 6rpx;
  background: #eef2fb;
  border-radius: 36rpx;
}

.mode-item {
  flex: 1;
  text-align: center;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  background: transparent;
  color: #65728b;
  font-size: 24rpx;
  font-weight: 600;
  transition: all 0.25s ease;
}

.mode-item.active {
  background: linear-gradient(135deg, #2f6bff, #5b8af5);
  color: #fff;
  box-shadow: 0 4rpx 14rpx rgba(47, 107, 255, 0.3);
}

.template-row {
  margin-top: 18rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.template-chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #eaf2ff, #f0f5ff);
  color: #315fb6;
  font-size: 22rpx;
  font-weight: 500;
  border: 1rpx solid rgba(47, 107, 255, 0.08);
  transition: all 0.2s ease;
}
.template-chip:active {
  background: linear-gradient(135deg, #dfe9ff, #e8f0ff);
  transform: scale(0.96);
}

.field + .field {
  margin-top: 28rpx;
}

.label {
  color: #1a2540;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.certified-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label-inline {
  color: #1a2540;
  font-size: 26rpx;
  font-weight: 600;
}

.input,
.textarea,
.picker {
  background: #f5f7fd;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #2b3448;
  border: 1rpx solid #edf1fa;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus,
.textarea:focus {
  border-color: rgba(47, 107, 255, 0.3);
  box-shadow: 0 0 0 4rpx rgba(47, 107, 255, 0.06);
}

.input,
.picker {
  height: 80rpx;
  line-height: 80rpx;
}

.textarea {
  width: auto;
  min-height: 200rpx;
  padding-top: 18rpx;
  line-height: 1.7;
}

.price-row {
  display: flex;
  gap: 14rpx;
}

.price-item {
  flex: 1;
}

.location-row {
  display: flex;
  gap: 10rpx;
}

.location-input {
  flex: 1;
}

.map-pick-btn {
  margin: 0;
  min-width: 150rpx;
  height: 80rpx;
  line-height: 80rpx;
  border: none;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #eaf2ff, #e2ecff);
  color: #2f6bff;
  font-size: 23rpx;
  font-weight: 600;
}

.location-tip {
  margin-top: 10rpx;
  color: #6e7e98;
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  background: #f5f8fd;
  border-radius: 10rpx;
}

.drag-hint {
  color: #8a95ac;
  font-size: 22rpx;
  margin-top: 4rpx;
}

.drag-area {
  width: 100%;
  margin-top: 12rpx;
}

.image-item {
  width: 146rpx;
  height: 146rpx;
  border-radius: 16rpx;
  overflow: hidden;
  position: relative;
  background: #eef2fa;
  border: 1rpx solid rgba(228, 235, 251, 0.6);
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
}

.image-item.dragging {
  transform: scale(1.08);
  opacity: 0.85;
  box-shadow: 0 8rpx 24rpx rgba(47, 107, 255, 0.25);
  z-index: 10;
}

.preview {
  width: 100%;
  height: 100%;
}

.remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 18rpx;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 22rpx;
  backdrop-filter: blur(4rpx);
}

.cover-badge {
  position: absolute;
  left: 6rpx;
  top: 6rpx;
  height: 32rpx;
  line-height: 32rpx;
  padding: 0 12rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, rgba(47, 107, 255, 0.92), rgba(36, 89, 214, 0.95));
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(47, 107, 255, 0.3);
}

.image-tools {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36rpx;
  display: flex;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.2));
}

.tool {
  flex: 1;
  text-align: center;
  line-height: 36rpx;
  color: #fff;
  font-size: 18rpx;
}

.upload {
  margin-top: 12rpx;
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 16rpx;
  background: #f5f7fd;
  border: 2rpx dashed #d0d8ea;
  color: #7a869f;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.upload:active {
  background: #edf1fb;
  border-color: #b8c6e4;
}

.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 18rpx 24rpx calc(26rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid rgba(228, 235, 251, 0.6);
  box-shadow: 0 -4rpx 20rpx rgba(31, 38, 66, 0.05);
  display: flex;
  gap: 12rpx;
}

.ai-btn,
.submit-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  border: none;
  font-size: 27rpx;
  font-weight: 600;
}

.ai-btn {
  background: linear-gradient(135deg, #e9f9f5, #dff5ef);
  color: #139c82;
  box-shadow: 0 4rpx 14rpx rgba(19, 156, 130, 0.12);
}

.submit-btn {
  background: linear-gradient(135deg, #2f6bff, #2459d6);
  color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(47, 107, 255, 0.3);
}
</style>
