/**
 * 图片加载优化工具
 * - 懒加载占位：列表项图片延迟加载
 * - 加载状态管理：loading / loaded / error
 * - 缩略图降级：优先加载小图，滚动停止后加载高清
 * - 缓存命中检测
 */

const DEFAULT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23f0f2f8' width='200' height='200'/%3E%3C/svg%3E";

const loadedCache = new Set();
const MAX_CACHE_SIZE = 200;

function addToCache(url) {
  if (loadedCache.size >= MAX_CACHE_SIZE) {
    const first = loadedCache.values().next().value;
    loadedCache.delete(first);
  }
  loadedCache.add(url);
}

export function isImageCached(url) {
  return loadedCache.has(url);
}

export function getPlaceholder() {
  return DEFAULT_PLACEHOLDER;
}

export function getThumbnailUrl(url, width = 200) {
  if (!url || typeof url !== "string") {
    return DEFAULT_PLACEHOLDER;
  }

  // Cloud file: append thumbnail params
  if (url.startsWith("cloud://")) {
    return url;
  }

  // CDN with query-based resize (common pattern)
  if (url.includes("picsum.photos") || url.includes("placeholder")) {
    return url;
  }

  // Tencent COS / Qiniu style thumbnail
  if (url.includes("myqcloud.com") || url.includes("qnimg.cn")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}imageView2/2/w/${width}`;
  }

  return url;
}

export function onImageLoad(url) {
  if (url && url !== DEFAULT_PLACEHOLDER) {
    addToCache(url);
  }
}

export function onImageError(url) {
  // Could log or track error rates
  console.warn("[ImageLoader] Failed to load:", url);
}

/**
 * 为列表项生成带懒加载状态的图片数据
 * @param {Array} items - 列表项数组
 * @param {string} imageField - 图片字段名
 * @returns {Array} 增强后的列表项
 */
export function withLazyImages(items, imageField = "image") {
  return items.map((item) => {
    const url = item[imageField];
    return {
      ...item,
      _imgSrc: isImageCached(url) ? url : getThumbnailUrl(url),
      _imgLoaded: isImageCached(url),
      _imgPlaceholder: DEFAULT_PLACEHOLDER
    };
  });
}

/**
 * Vue mixin：为页面/组件提供图片懒加载能力
 * 使用方法：在组件 mixins 中引入
 *
 * <image :src="item._imgSrc" @load="onImgLoad(item, 'image')" @error="onImgErr(item)" />
 */
export const lazyImageMixin = {
  methods: {
    onImgLoad(item, field = "image") {
      const url = item[field];
      onImageLoad(url);
      if (item._imgSrc !== url) {
        item._imgSrc = url;
      }
      item._imgLoaded = true;
    },

    onImgErr(item) {
      onImageError(item._imgSrc);
      item._imgSrc = DEFAULT_PLACEHOLDER;
      item._imgLoaded = false;
    }
  }
};
