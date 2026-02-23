import { isCloudReady } from "@/utils/cloud";
import { generateId } from "@/utils/common";
import { withTimeout } from "@/utils/error-handler";

const USER_KEY = "cm_user";
const TOKEN_KEY = "cm_token";

function wait(ms = 240) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getStoredUser() {
  try {
    return uni.getStorageSync(USER_KEY) || null;
  } catch (error) {
    return null;
  }
}

export function getStoredToken() {
  try {
    return uni.getStorageSync(TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

export function saveAuthInfo(user, token) {
  uni.setStorageSync(USER_KEY, user);
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearAuthCache() {
  uni.removeStorageSync(USER_KEY);
  uni.removeStorageSync(TOKEN_KEY);
}

export async function mockLoginWithProfile(profile = {}) {
  await wait();

  const oldUser = getStoredUser();

  const user = {
    userId: oldUser?.userId || generateId("user"),
    nickName: profile.nickName || "校园用户",
    avatar: profile.avatarUrl || "https://picsum.photos/seed/default-avatar/120/120",
    rating: oldUser?.rating || 5,
    studentId: oldUser?.studentId || "",
    phone: oldUser?.phone || ""
  };

  const token = `mock-token-${Date.now()}`;
  saveAuthInfo(user, token);

  return {
    user,
    token
  };
}

async function cloudLoginWithProfile(profile = {}) {
  if (!isCloudReady() || typeof wx.cloud.callFunction !== "function") {
    return null;
  }

  const oldUser = getStoredUser();
  const loginPromise = wx.cloud.callFunction({
    name: "login",
    data: {
      userInfo: profile
    }
  });

  const callRes = await withTimeout(loginPromise, 3000).catch((error) => {
    console.warn("[Auth] cloudLoginWithProfile failed or timeout:", error);
    return null;
  });

  const result = callRes?.result;
  if (!result || result.code !== 0) {
    return null;
  }

  const cloudUser = result.userInfo || {};
  const user = {
    userId: cloudUser.openid || oldUser?.userId || `user-${Date.now()}`,
    nickName: cloudUser.nickName || profile.nickName || oldUser?.nickName || "校园用户",
    avatar:
      cloudUser.avatar ||
      cloudUser.avatarUrl ||
      profile.avatarUrl ||
      oldUser?.avatar ||
      "https://picsum.photos/seed/default-avatar/120/120",
    rating: Number(cloudUser.rating) || oldUser?.rating || 5,
    studentId: cloudUser.studentId || oldUser?.studentId || "",
    phone: cloudUser.phone || oldUser?.phone || ""
  };

  const token = result.token || `cloud-token-${Date.now()}`;
  saveAuthInfo(user, token);

  return {
    user,
    token,
    from: "cloud"
  };
}

export async function loginWithProfile(profile = {}) {
  const cloudAuth = await cloudLoginWithProfile(profile);
  if (cloudAuth) {
    return cloudAuth;
  }

  const mockAuth = await mockLoginWithProfile(profile);
  return {
    ...mockAuth,
    from: "mock"
  };
}
