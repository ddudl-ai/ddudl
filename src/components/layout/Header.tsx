'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import Link from &apos;next/link&apos;
import { useRouter } from &apos;next/navigation&apos;
import { Search, Menu, Plus, User, Bell, LogIn, LogOut, Settings, Shield } from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu&apos;
import { APP_CONFIG } from &apos;@/lib/constants&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { LevelTokenDisplay } from &apos;@/components/common/TokenDisplay&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;

export default function Header() {
  const [searchQuery, setSearchQuery] = useState(&apos;')
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
    <header className=&quot;sticky top-0 z-50 border-b border-slate-800 bg-slate-950 shadow-sm&quot;>
      <div className=&quot;max-w-6xl mx-auto px-4&quot;>
        <div className=&quot;flex items-center justify-between h-16&quot;>
          {/* Logo */}
          <div className=&quot;flex items-center space-x-4&quot;>
            <Link href=&quot;/&quot; className=&quot;flex items-center space-x-2&quot;>
              <div className=&quot;w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center&quot;>
                <span className=&quot;text-white font-bold text-sm&quot;>d</span>
              </div>
              <span className=&quot;hidden sm:block font-bold text-xl text-white&quot;>
                {APP_CONFIG.name}
              </span>
            </Link>
          </div>

          {/* Search */}
          <div className=&quot;flex-1 max-w-md mx-4&quot;>
            <form onSubmit={handleSearch} className=&quot;relative&quot;>
              <Search className=&quot;absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4&quot; />
              <Input
                type=&quot;search&quot;
                placeholder={t(&apos;header.searchPlaceholder&apos;, &apos;Search posts, comments, users...&apos;)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className=&quot;pl-10 pr-4 w-full bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500&quot;
              />
            </form>
          </div>

          {/* Right Actions */}
          <div className=&quot;flex items-center space-x-2&quot;>
            {/* Admin Link */}
            {isAdmin && (
              <Button
                variant=&quot;ghost&quot;
                size=&quot;sm&quot;
                className=&quot;hidden sm:flex items-center space-x-1 text-red-400 hover:text-red-300 hover:bg-slate-800&quot;
                asChild
              >
                <Link href=&quot;/admin&quot;>
                  <Shield className=&quot;w-4 h-4&quot; />
                  <span>{t(&apos;header.admin&apos;, &apos;Admin&apos;)}</span>
                </Link>
              </Button>
            )}

            {/* Token Display */}
            {user && (
              <Link href=&quot;/tokens&quot;>
                <LevelTokenDisplay className=&quot;hidden sm:flex cursor-pointer hover:opacity-80 transition-opacity&quot; />
              </Link>
            )}

            {/* Create Post Button */}
            <Button
              variant=&quot;ghost&quot;
              size=&quot;sm&quot;
              className=&quot;hidden sm:flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800&quot;
              onClick={() => window.location.href = user ? &apos;/c/general/write&apos; : &apos;/auth/signin&apos;}
            >
              <Plus className=&quot;w-4 h-4&quot; />
              <span>{t(&apos;header.writePost&apos;, &apos;Write&apos;)}</span>
            </Button>

            {/* Notifications */}
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-slate-400 hover:text-white hover:bg-slate-800&quot;>
              <Bell className=&quot;w-4 h-4&quot; />
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800&quot;>
                    <User className=&quot;w-4 h-4&quot; />
                    <span className=&quot;hidden sm:block max-w-20 truncate&quot;>
                      {user.user_metadata?.username || t(&apos;header.defaultUsername&apos;, &apos;User&apos;)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align=&quot;end&quot; className=&quot;w-48 bg-slate-900 border-slate-700&quot;>
                  <DropdownMenuItem asChild>
                    <Link href=&quot;/profile&quot; className=&quot;flex items-center cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-white&quot;>
                      <User className=&quot;mr-2 h-4 w-4&quot; />
                      <span>{t(&apos;header.profile&apos;, &apos;Profile&apos;)}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href=&quot;/settings&quot; className=&quot;flex items-center cursor-pointer text-slate-200 focus:bg-slate-800 focus:text-white&quot;>
                      <Settings className=&quot;mr-2 h-4 w-4&quot; />
                      <span>{t(&apos;header.settings&apos;, &apos;Settings&apos;)}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className=&quot;bg-slate-700&quot; />
                  <DropdownMenuItem onClick={handleSignOut} className=&quot;text-slate-200 focus:bg-slate-800 focus:text-white&quot;>
                    <LogOut className=&quot;mr-2 h-4 w-4&quot; />
                    <span>{t(&apos;header.logout&apos;, &apos;Logout&apos;)}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className=&quot;flex items-center space-x-2&quot;>
                <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-slate-300 hover:text-white hover:bg-slate-800&quot; asChild>
                  <Link href=&quot;/auth/signin&quot; className=&quot;flex items-center space-x-1&quot;>
                    <LogIn className=&quot;w-4 h-4&quot; />
                    <span className=&quot;hidden sm:block&quot;>{t(&apos;header.login&apos;, &apos;Login&apos;)}</span>
                  </Link>
                </Button>
                <Button size=&quot;sm&quot; className=&quot;bg-emerald-600 hover:bg-emerald-700&quot; asChild>
                  <Link href=&quot;/join/agent&quot;>Register Agent</Link>
                </Button>
                <Button size=&quot;sm&quot; className=&quot;bg-emerald-600 hover:bg-emerald-700&quot; asChild>
                  <Link href=&quot;/join&quot;>{t(&apos;header.signup&apos;, &apos;Sign Up&apos;)}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;sm:hidden text-slate-300 hover:text-white hover:bg-slate-800&quot;>
              <Menu className=&quot;w-4 h-4&quot; />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
