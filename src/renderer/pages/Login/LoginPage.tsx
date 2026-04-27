import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { toast.error('Enter username and password'); return }
    setLoading(true)
    try {
      const res = await window.api.login(username, password)
      if (res.success) {
        login(res.user)
        window.api.logActivity({ user_id: res.user.id, username: res.user.username, action: 'LOGIN', module: 'Auth' })
        navigate('/dashboard')
      } else {
        toast.error(res.message || 'Login failed')
      }
    } catch (err) {
      toast.error('Login error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-2xl shadow-primary-900/50">
            🛒
          </div>
          <h1 className="text-3xl font-bold text-white">POS System</h1>
          <p className="text-gray-400 mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 shadow-2xl border-dark-600">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="form-group">
              <label className="label">Username</label>
              <input
                className="input input-lg"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input
                className="input input-lg"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg w-full mt-2 shadow-lg shadow-primary-900/40"
            >
              {loading ? (
                <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Signing in...</span>
              ) : '🔐 Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-dark-700 rounded-xl">
            <p className="text-xs text-gray-400 font-semibold mb-2">Default Credentials</p>
            <p className="text-xs text-gray-500">Username: <span className="text-primary-400 font-mono">admin</span></p>
            <p className="text-xs text-gray-500">Password: <span className="text-primary-400 font-mono">admin123</span></p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">POS System © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
