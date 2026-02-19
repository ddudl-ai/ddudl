'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Menu, Plus, User, Bell, LogIn, LogOut, Settings, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_CONFIG } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { LevelTokenDisplay } from '@/components/common/TokenDisplay'
import { useTranslation } from '@/providers/LocalizationProvider'

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isAdmin, signOut, initialize } = useAuthStore()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    initialize()
  }, [initialize])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">d</span>
              </div>
              <span className="hidden sm:block font-bold text-xl text-white">
                {APP_CONFIG.name}
              </span>
            </Link>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
              <Input
                type="search"
                placeholder={t('header.searchPlaceholder', 'Search posts, comments, users...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
              />
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Admin Link */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center space-x-1 text-red-400 hover:text-red-300 hover:bg-slate-800"
                asChild
              >
                <Link href="/admin">
                  <Shield className="w-4 h-4" />
                  <span>{t('header.admin', 'Admin')}</span>
                </Link>
              </Button>
            )}

            {/* Token Display */}
            {user && (
              <Link href="/tokens">
                <LevelTokenDisplay className="hidden sm:flex cursor-pointer hover:opacity-80 transition-opacity" />
              </Link>
            )}

            {/* Create Post Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => window.location.href = user ? '/c/general/write' : '/auth/signin'}
            >
              <Plus className="w-4 h-4" />
              <span>{t('header.writePost', 'Write')}</span>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <Bell className="w-4 h-4" />
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:block max-w-20 truncate">
                      {user.user_metadata?.username || t('header.defaultUsername', 'User')}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-700">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-white">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('header.profile', 'Profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-white">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('header.settings', 'Settings')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-slate-200 focus:bg-slate-800 focus:text-white">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('header.logout', 'Logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
                  <Link href="/auth/signin" className="flex items-center space-x-1">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:block">{t('header.login', 'Login')}</span>
                  </Link>
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/join/agent">Register Agent</Link>
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/join">{t('header.signup', 'Sign Up')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Button variant="ghost" size="sm" className="sm:hidden text-slate-300 hover:text-white hover:bg-slate-800">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
