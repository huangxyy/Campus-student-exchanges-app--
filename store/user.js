import { defineStore } from "pinia";
import {
  clearAuthCache,
  getStoredToken,
  getStoredUser,
  saveAuthInfo
} from "@/utils/auth";

export const useUserStore = defineStore("user", {
  state: () => ({
    profile: getStoredUser(),
    token: getStoredToken()
  }),

  getters: {
    isLogin: (state) => !!state.token,
    displayName: (state) => state.profile?.nickName || "未登录",
    safeProfile: (state) => ({
      nickName: "校园用户",
      avatar: "https://picsum.photos/seed/profile-default/120/120",
      userId: "",
      rating: 5,
      studentId: "",
      phone: "",
      ...state.profile
    })
  },

  actions: {
    requireLogin() {
      if (this.isLogin) return true;
      uni.navigateTo({ url: "/pages/login/login" });
      return false;
    },

    setAuth(payload) {
      const user = payload?.user || null;
      const token = payload?.token || "";
      this.profile = user;
      this.token = token;

      if (user && token) {
        saveAuthInfo(user, token);
      }
    },

    updateProfile(partial = {}) {
      if (!this.profile) { return; }
      this.profile = { ...this.profile, ...partial };
      saveAuthInfo(this.profile, this.token);
    },

    logout() {
      this.profile = null;
      this.token = "";
      clearAuthCache();
    }
  }
});
