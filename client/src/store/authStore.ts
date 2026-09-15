import { create } from "zustand";
import { api } from "../lib/api";
import type { User } from "../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  checked: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  checked: false,

  async login(username, password) {
    set({ loading: true });
    try {
      const user = await api.post<User>("/auth/login", { username, password });
      set({ user, loading: false, checked: true });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  async logout() {
    await api.post("/auth/logout");
    set({ user: null });
  },

  async fetchMe() {
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, checked: true });
    } catch {
      set({ user: null, checked: true });
    }
  },
}));
