let cloudInitialized = false;

export function isCloudReady() {
  return typeof wx !== "undefined" && !!wx.cloud;
}

export function getCloudDatabase() {
  if (!isCloudReady() || typeof wx.cloud.database !== "function") {
    return null;
  }
  return wx.cloud.database();
}

export function initCloud() {
  if (cloudInitialized) {
    return;
  }

  if (!isCloudReady() || typeof wx.cloud.init !== "function") {
    return;
  }

  const options = {
    traceUser: true
  };

  if (wx.cloud.DYNAMIC_CURRENT_ENV) {
    options.env = wx.cloud.DYNAMIC_CURRENT_ENV;
  }

  wx.cloud.init(options);

  cloudInitialized = true;
}
