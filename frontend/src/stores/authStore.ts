import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '../services/mockData'

interface AuthState {
  user: UserInfo | null
  token: string | null
  isLoggedIn: boolean
  login: (user: UserInfo, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      login: (user: UserInfo, token: string) => {
        localStorage.setItem('auth-token', token)
        set({ user, token, isLoggedIn: true })
      },
      logout: () => {
        localStorage.removeItem('auth-token')
        localStorage.removeItem('auth-storage')
        set({ user: null, token: null, isLoggedIn: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
)
