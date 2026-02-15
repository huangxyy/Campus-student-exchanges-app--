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
    displayName: (state) => state.profile?.nickName || "未登录"
  },

  actions: {
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
