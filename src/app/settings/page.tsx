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
  Trash2
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
    // 실제로는 API에서 User 설정을 불러와야 함
    // 여기서는 기본값 사용
    setLoading(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    // API 호출로 설정 저장
    setTimeout(() => {
      setSaving(false)
      alert(t('settings.saved', '설정이 저장되었습니다.'))
    }, 1000)
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    // API 호출로 비밀번호 변경
    alert('비밀번호가 변경되었습니다.')
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
  }

  const handleSignOut = async () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      await signOut()
      router.push('/')
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm('정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      // API 호출로 계정 삭제
      alert('계정이 삭제되었습니다.')
      await signOut()
      router.push('/')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-4">설정을 관리하려면 로그인하세요.</p>
              <Button asChild>
                <Link href="/auth/signin">로그인</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <LoadingSpinner text={t('settings.loading', '설정 로딩 중...')} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('settings.title', '설정')}</h1>
          <p className="text-gray-600">{t('settings.subtitle', '계정 및 앱 환경설정을 관리하세요')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">계정</TabsTrigger>
            <TabsTrigger value="notifications">알림</TabsTrigger>
            <TabsTrigger value="privacy">개인정보</TabsTrigger>
            <TabsTrigger value="preferences">환경설정</TabsTrigger>
          </TabsList>

          {/* 계정 설정 */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
                <CardDescription>
                  기본 계정 정보를 확인하고 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 프로필 이미지 */}
                <div className="space-y-2">
                  <Label>프로필 이미지</Label>
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
                          if (!up.ok) throw new Error('업로드 실패')
                          const data = await up.json()
                          // 서버에 프로필 이미지 URL 저장
                          const res = await fetch('/api/users/profile-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, imageUrl: data.url })
                          })
                          if (!res.ok) throw new Error('프로필 이미지 저장 실패')
                          alert('프로필 이미지가 업데이트되었습니다.')
                        } catch (err) {
                          console.error(err)
                          alert('프로필 이미지 업데이트에 실패했습니다.')
                        } finally {
                          if (e.target) e.target.value = ''
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>이메일</Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      value={user.email || ''} 
                      disabled 
                      className="flex-1"
                    />
                    <Badge variant="secondary">
                      <Check className="w-3 h-3 mr-1" />
                      인증됨
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User명</Label>
                  <Input 
                    value={user.user_metadata?.username || ''} 
                    disabled 
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>연결된 계정</Label>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="w-4 h-4 mr-2" />
                      Google 계정 연결
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Smartphone className="w-4 h-4 mr-2" />
                      카카오 계정 연결
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경</CardTitle>
                <CardDescription>
                  계정 보안을 위해 정기적으로 비밀번호를 변경하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">현재 비밀번호</Label>
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
                  <Label htmlFor="new-password">새 비밀번호</Label>
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
                  <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
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
                  비밀번호 변경
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">위험 구역</CardTitle>
                <CardDescription>
                  이 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>

                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  계정 삭제
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 알림 설정 */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>
                  어떤 알림을 받을지 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>이메일 알림</Label>
                    <p className="text-sm text-gray-500">
                      중요한 업데이트를 이메일로 받습니다
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
                    <Label>푸시 알림</Label>
                    <p className="text-sm text-gray-500">
                      브라우저 푸시 알림을 받습니다
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
                    <Label>댓글 답글 알림</Label>
                    <p className="text-sm text-gray-500">
                      내 댓글에 답글이 달리면 알림을 받습니다
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
                    <Label>추천 알림</Label>
                    <p className="text-sm text-gray-500">
                      내 게시물이 추천을 받으면 알림을 받습니다
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

          {/* 개인정보 설정 */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>개인정보 보호</CardTitle>
                <CardDescription>
                  프로필 공개 범위와 개인정보 설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>비공개 프로필</Label>
                    <p className="text-sm text-gray-500">
                      로그인한 User만 내 프로필을 볼 수 있습니다
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
                    <Label>온라인 상태 표시</Label>
                    <p className="text-sm text-gray-500">
                      다른 User에게 온라인 상태를 표시합니다
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
                    <Label>성인 콘텐츠</Label>
                    <p className="text-sm text-gray-500">
                      성인 콘텐츠를 볼 수 있습니다 (연령 인증 필요)
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
                <CardTitle>차단 목록</CardTitle>
                <CardDescription>
                  차단한 User와 커뮤니티를 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    차단한 User 관리
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    차단한 커뮤니티 관리
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 환경설정 */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.appPreferences', '앱 환경설정')}</CardTitle>
                <CardDescription>
                  {t('settings.appPreferencesDescription', '앱 사용 환경을 커스터마이즈하세요')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('settings.darkModeLabel', '다크 모드')}</Label>
                    <p className="text-sm text-gray-500">
                      {t('settings.darkModeDescription', '어두운 테마를 사용합니다')}
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
                  <Label>{t('settings.languageLabel', '언어')}</Label>
                  <p className="text-sm text-gray-500">
                    {t('settings.languageDescription', '앱 메뉴의 기본 표시 언어를 선택하세요')}
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
                    <Label>{t('settings.autoTranslateLabel', '자동 번역')}</Label>
                    <p className="text-sm text-gray-500">
                      {t('settings.autoTranslateDescription', '선택한 언어로 게시물과 댓글을 자동으로 번역합니다')}
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
                    <Label>{t('settings.autoPlayLabel', '동영상 자동 재생')}</Label>
                    <p className="text-sm text-gray-500">
                      {t('settings.autoPlayDescription', '피드의 동영상을 자동으로 재생합니다')}
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
                <CardTitle>{t('settings.premiumTitle', '프리미엄 기능')}</CardTitle>
                <CardDescription>
                  {t('settings.premiumDescription', 'ddudl 프리미엄으로 더 많은 기능을 이용하세요')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="border-amber-200 bg-amber-50">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {t('settings.premiumBenefit', '프리미엄 멤버십으로 광고 제거, 특별 배지, 우선 지원 등의 혜택을 받으세요!')}
                  </AlertDescription>
                </Alert>
                <Button className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                  {t('settings.upgradeButton', '프리미엄 업그레이드')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 저장 버튼 */}
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">{t('settings.saving', '저장 중...')}</span>
              </>
            ) : (
              t('settings.save', '설정 저장')
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
