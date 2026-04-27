import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: number
  username: string
  full_name: string
  role: 'admin' | 'manager' | 'cashier'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
}

const rolePermissions: Record<string, string[]> = {
  admin: ['*'],
  manager: ['dashboard', 'pos', 'products', 'customers', 'suppliers', 'reports', 'expenses', 'stock'],
  cashier: ['pos', 'dashboard', 'customers']
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      hasPermission: (permission: string) => {
        const { user } = get()
        if (!user) return false
        const perms = rolePermissions[user.role] || []
        return perms.includes('*') || perms.includes(permission)
      }
    }),
    {
      name: 'pos-auth',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
)
