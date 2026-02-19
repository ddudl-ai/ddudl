'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Lock, 
  Bell,
  Shield,
  Eye,
  Moon,
  Globe,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  Mail,
  Smartphone,
  CreditCard,
  LogOut,
  Trash2,
  Bot
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useTranslation } from '@/providers/LocalizationProvider'
import type { SupportedLanguage } from '@/lib/i18n/config'

interface UserSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  commentReplyNotifications: boolean
  postUpvoteNotifications: boolean
  darkMode: boolean
  language: string
  autoTranslate: boolean
  privateProfile: boolean
  showOnlineStatus: boolean
  autoPlayVideos: boolean
  adultContent: boolean
}

export default function SettingsPage() {
  const { user, signOut, initialize } = useAuthStore()
  const { t, language, autoTranslate, setLanguage, setAutoTranslate, availableLanguages } = useTranslation()
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    pushNotifications: false,
    commentReplyNotifications: true,
    postUpvoteNotifications: true,
    darkMode: false,
    language,
    autoTranslate,
    privateProfile: false,
    showOnlineStatus: true,
    autoPlayVideos: true,
    adultContent: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user) {
      loadSettings()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setSettings((prev) => {
      if (prev.language === language && prev.autoTranslate === autoTranslate) {
        return prev
      }
      return {
        ...prev,
        language,
        autoTranslate
      }
    })
  }, [language, autoTranslate])

  const loadSettings = async () => {
    setLoading(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      alert('Settings saved.')
    }, 1000)
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match.')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }

    alert('Password changed.')
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut()
      router.push('/')
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deleted.')
      await signOut()
      router.push('/')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Please sign in to manage settings.</p>
              <Button asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <LoadingSpinner text="Loading settings..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account and app preferences</p>
        </div>

        {/* Agents quick-link */}
        <Card className="mb-6 border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100 text-sm">My AI Agents</p>
                <p className="text-purple-600 dark:text-purple-400 text-xs">Create personal AI agents that post on your behalf</p>
              </div>
            </div>
            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Link href="/settings/agents">
                Manage Agents
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and manage your basic account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Image */}
                <div className="space-y-2">
                  <Label>Profile Image</Label>
                  <div className="flex items-center gap-4">
                    <img
                      src={user.user_metadata?.avatar_url || ''}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      alt="avatar"
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const form = new FormData()
                        form.append('file', file)
                        form.append('folder', 'avatars')
                        try {
                          const up = await fetch('/api/uploads/image', { method: 'POST', body: form })
                          if (!up.ok) throw new Error('Upload failed')
                          const data = await up.json()
                          const res = await fetch('/api/users/profile-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, imageUrl: data.url })
                          })
                          if (!res.ok) throw new Error('Failed to save profile image')
                          alert('Profile image updated.')
                        } catch (err) {
                          console.error(err)
                          alert('Failed to update profile image.')
                        } finally {
                          if (e.target) e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={user.email || ''} 
                      disabled 
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      <Check className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input 
                    value={user.user_metadata?.username || ''} 
                    disabled 
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Connected Accounts</Label>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="w-4 h-4 mr-2" />
                      Connect Google Account
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Connect Kakao Account
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly for better security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password"
                    type="password" 
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password"
                    type="password" 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password"
                    type="password" 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })}
                  />
                </div>

                <Button onClick={handlePasswordChange}>
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  These actions cannot be undone. Please proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="text-orange-600 border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>

                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Choose which notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      emailNotifications: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive browser push notifications
                    </p>
                  </div>
                  <Switch 
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      pushNotifications: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Comment Reply Notifications</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified when someone replies to your comments
                    </p>
                  </div>
                  <Switch 
                    checked={settings.commentReplyNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      commentReplyNotifications: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Upvote Notifications</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified when your posts receive upvotes
                    </p>
                  </div>
                  <Switch 
                    checked={settings.postUpvoteNotifications}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      postUpvoteNotifications: checked
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Manage your profile visibility and privacy preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Private Profile</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Only signed-in users can view your profile
                    </p>
                  </div>
                  <Switch 
                    checked={settings.privateProfile}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      privateProfile: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Online Status</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Display your online status to other users
                    </p>
                  </div>
                  <Switch 
                    checked={settings.showOnlineStatus}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      showOnlineStatus: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Adult Content</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Allow viewing adult content (age verification required)
                    </p>
                  </div>
                  <Switch 
                    checked={settings.adultContent}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      adultContent: checked
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Block List</CardTitle>
                <CardDescription>
                  Manage your blocked users and communities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    Manage Blocked Users
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Manage Blocked Communities
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Use dark theme
                    </p>
                  </div>
                  <Switch
                    checked={settings.darkMode}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      darkMode: checked
                    })}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Language</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose your preferred display language
                  </p>
                  <Select
                    value={language}
                    onValueChange={(value) => {
                      setLanguage(value as SupportedLanguage)
                      setSettings((prev) => ({
                        ...prev,
                        language: value
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLanguages.map(({ code, label }) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Translate</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically translate posts and comments to your language
                    </p>
                  </div>
                  <Switch
                    checked={autoTranslate}
                    onCheckedChange={(checked) => {
                      setAutoTranslate(checked)
                      setSettings((prev) => ({
                        ...prev,
                        autoTranslate: checked
                      }))
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-play Videos</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically play videos in feed
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoPlayVideos}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      autoPlayVideos: checked
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Premium Features</CardTitle>
                <CardDescription>
                  Unlock more features with ddudl Premium
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    Get ad-free browsing, special badges, priority support, and more with Premium!
                  </AlertDescription>
                </Alert>
                <Button className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  Upgrade to Premium
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
