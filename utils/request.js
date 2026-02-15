const DEFAULT_TIMEOUT = 10000;

function getToken() {
  try {
    return uni.getStorageSync("cm_token") || "";
  } catch (error) {
    return "";
  }
}

export function request(options = {}) {
  const {
    url,
    method = "GET",
    data = {},
    header = {},
    baseUrl = "",
    timeout = DEFAULT_TIMEOUT,
    withToken = true,
    showLoading = false,
    loadingTitle = "加载中..."
  } = options;

  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Request URL is required"));
      return;
    }

    const token = getToken();
    const mergedHeader = {
      "content-type": "application/json",
      ...header
    };

    if (withToken && token) {
      mergedHeader.Authorization = `Bearer ${token}`;
    }

    if (showLoading) {
      uni.showLoading({
        title: loadingTitle,
        mask: true
      });
    }

    uni.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      timeout,
      header: mergedHeader,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(new Error(res.data?.message || `Request failed: ${res.statusCode}`));
      },
      fail: (error) => {
        reject(error);
      },
      complete: () => {
        if (showLoading) {
          uni.hideLoading();
        }
      }
    });
  });
}
