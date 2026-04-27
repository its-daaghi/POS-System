import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, string>
  loaded: boolean
  load: () => Promise<void>
  get: (key: string, fallback?: string) => string
  update: (data: Record<string, string>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  loaded: false,

  load: async () => {
    const data = await window.api.getSettings()
    set({ settings: data, loaded: true })
  },

  get: (key: string, fallback = '') => {
    return get().settings[key] ?? fallback
  },

  update: async (data: Record<string, string>) => {
    await window.api.updateSettings(data)
    set(state => ({ settings: { ...state.settings, ...data } }))
  }
}))
