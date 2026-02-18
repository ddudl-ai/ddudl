'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import Link from &apos;next/link&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { Switch } from &apos;@/components/ui/switch&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Alert, AlertDescription } from &apos;@/components/ui/alert&apos;
import { Separator } from &apos;@/components/ui/separator&apos;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &apos;@/components/ui/select&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
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
} from &apos;lucide-react&apos;
import Header from &apos;@/components/layout/Header&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;
import type { SupportedLanguage } from &apos;@/lib/i18n/config&apos;

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
  const [activeTab, setActiveTab] = useState(&apos;account&apos;)
  const [passwordData, setPasswordData] = useState({
    currentPassword: &apos;',
    newPassword: &apos;',
    confirmPassword: &apos;'
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
      alert(t(&apos;settings.saved&apos;, &apos;설정이 저장되었습니다.&apos;))
    }, 1000)
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert(&apos;새 비밀번호가 일치하지 않습니다.&apos;)
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert(&apos;비밀번호는 최소 6자 이상이어야 합니다.&apos;)
      return
    }

    // API 호출로 비밀번호 변경
    alert(&apos;비밀번호가 변경되었습니다.&apos;)
    setPasswordData({
      currentPassword: &apos;',
      newPassword: &apos;',
      confirmPassword: &apos;'
    })
  }

  const handleSignOut = async () => {
    if (confirm(&apos;정말 로그아웃 하시겠습니까?&apos;)) {
      await signOut()
      router.push(&apos;/&apos;)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm(&apos;정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.&apos;)) {
      // API 호출로 계정 삭제
      alert(&apos;계정이 삭제되었습니다.&apos;)
      await signOut()
      router.push(&apos;/&apos;)
    }
  }

  if (!user) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
          <Card>
            <CardContent className=&quot;pt-6 text-center&quot;>
              <p className=&quot;text-gray-600 mb-4&quot;>설정을 관리하려면 로그인하세요.</p>
              <Button asChild>
                <Link href=&quot;/auth/signin&quot;>로그인</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
          <div className=&quot;flex justify-center&quot;>
            <LoadingSpinner text={t(&apos;settings.loading&apos;, &apos;설정 로딩 중...&apos;)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className=&quot;min-h-screen bg-gray-50&quot;>
      <Header />
      
      <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
        <div className=&quot;mb-8&quot;>
          <h1 className=&quot;text-3xl font-bold mb-2&quot;>{t(&apos;settings.title&apos;, &apos;설정&apos;)}</h1>
          <p className=&quot;text-gray-600&quot;>{t(&apos;settings.subtitle&apos;, &apos;계정 및 앱 환경설정을 관리하세요&apos;)}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className=&quot;grid w-full grid-cols-4&quot;>
            <TabsTrigger value=&quot;account&quot;>계정</TabsTrigger>
            <TabsTrigger value=&quot;notifications&quot;>알림</TabsTrigger>
            <TabsTrigger value=&quot;privacy&quot;>개인정보</TabsTrigger>
            <TabsTrigger value=&quot;preferences&quot;>환경설정</TabsTrigger>
          </TabsList>

          {/* 계정 설정 */}
          <TabsContent value=&quot;account&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
                <CardDescription>
                  기본 계정 정보를 확인하고 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className=&quot;space-y-4&quot;>
                {/* 프로필 이미지 */}
                <div className=&quot;space-y-2&quot;>
                  <Label>프로필 이미지</Label>
                  <div className=&quot;flex items-center gap-4&quot;>
                    <img
                      src={user.user_metadata?.avatar_url || &apos;'}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = &apos;none&apos; }}
                      alt=&quot;avatar&quot;
                      className=&quot;w-16 h-16 rounded-full object-cover border&quot;
                    />
                    <input
                      type=&quot;file&quot;
                      accept=&quot;image/*&quot;
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const form = new FormData()
                        form.append(&apos;file&apos;, file)
                        form.append(&apos;folder&apos;, &apos;avatars&apos;)
                        try {
                          const up = await fetch(&apos;/api/uploads/image&apos;, { method: &apos;POST&apos;, body: form })
                          if (!up.ok) throw new Error(&apos;업로드 실패&apos;)
                          const data = await up.json()
                          // 서버에 프로필 이미지 URL 저장
                          const res = await fetch(&apos;/api/users/profile-image&apos;, {
                            method: &apos;POST&apos;,
                            headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
                            body: JSON.stringify({ userId: user.id, imageUrl: data.url })
                          })
                          if (!res.ok) throw new Error(&apos;프로필 이미지 저장 실패&apos;)
                          alert(&apos;프로필 이미지가 업데이트되었습니다.&apos;)
                        } catch (err) {
                          console.error(err)
                          alert(&apos;프로필 이미지 업데이트에 실패했습니다.&apos;)
                        } finally {
                          if (e.target) e.target.value = &apos;'
                        }
                      }}
                    />
                  </div>
                </div>

                <div className=&quot;space-y-2&quot;>
                  <Label>이메일</Label>
                  <div className=&quot;flex items-center space-x-2&quot;>
                    <Input 
                      value={user.email || &apos;'} 
                      disabled 
                      className=&quot;flex-1&quot;
                    />
                    <Badge variant=&quot;secondary&quot;>
                      <Check className=&quot;w-3 h-3 mr-1&quot; />
                      인증됨
                    </Badge>
                  </div>
                </div>

                <div className=&quot;space-y-2&quot;>
                  <Label>User명</Label>
                  <Input 
                    value={user.user_metadata?.username || &apos;'} 
                    disabled 
                  />
                </div>

                <Separator />

                <div className=&quot;space-y-2&quot;>
                  <Label>연결된 계정</Label>
                  <div className=&quot;space-y-2&quot;>
                    <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                      <Mail className=&quot;w-4 h-4 mr-2&quot; />
                      Google 계정 연결
                      <ChevronRight className=&quot;w-4 h-4 ml-auto&quot; />
                    </Button>
                    <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                      <Smartphone className=&quot;w-4 h-4 mr-2&quot; />
                      카카오 계정 연결
                      <ChevronRight className=&quot;w-4 h-4 ml-auto&quot; />
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
              <CardContent className=&quot;space-y-4&quot;>
                <div className=&quot;space-y-2&quot;>
                  <Label htmlFor=&quot;current-password&quot;>현재 비밀번호</Label>
                  <Input 
                    id=&quot;current-password&quot;
                    type=&quot;password&quot; 
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value
                    })}
                  />
                </div>

                <div className=&quot;space-y-2&quot;>
                  <Label htmlFor=&quot;new-password&quot;>새 비밀번호</Label>
                  <Input 
                    id=&quot;new-password&quot;
                    type=&quot;password&quot; 
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value
                    })}
                  />
                </div>

                <div className=&quot;space-y-2&quot;>
                  <Label htmlFor=&quot;confirm-password&quot;>새 비밀번호 확인</Label>
                  <Input 
                    id=&quot;confirm-password&quot;
                    type=&quot;password&quot; 
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value
                    })}
                  />
                </div>

                <Button onClick={handlePasswordChange}>
                  <Lock className=&quot;w-4 h-4 mr-2&quot; />
                  비밀번호 변경
                </Button>
              </CardContent>
            </Card>

            <Card className=&quot;border-red-200&quot;>
              <CardHeader>
                <CardTitle className=&quot;text-red-600&quot;>위험 구역</CardTitle>
                <CardDescription>
                  이 작업들은 되돌릴 수 없습니다. 신중하게 진행하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className=&quot;space-y-4&quot;>
                <Button 
                  variant=&quot;outline&quot; 
                  className=&quot;text-orange-600 border-orange-600 hover:bg-orange-50&quot;
                  onClick={handleSignOut}
                >
                  <LogOut className=&quot;w-4 h-4 mr-2&quot; />
                  로그아웃
                </Button>

                <Button 
                  variant=&quot;outline&quot; 
                  className=&quot;text-red-600 border-red-600 hover:bg-red-50&quot;
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className=&quot;w-4 h-4 mr-2&quot; />
                  계정 삭제
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 알림 설정 */}
          <TabsContent value=&quot;notifications&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>
                  어떤 알림을 받을지 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent className=&quot;space-y-6&quot;>
                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>이메일 알림</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>푸시 알림</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>댓글 답글 알림</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>추천 알림</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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
          <TabsContent value=&quot;privacy&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>개인정보 보호</CardTitle>
                <CardDescription>
                  프로필 공개 범위와 개인정보 설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className=&quot;space-y-6&quot;>
                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>비공개 프로필</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>온라인 상태 표시</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>성인 콘텐츠</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
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
                <div className=&quot;space-y-2&quot;>
                  <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                    <User className=&quot;w-4 h-4 mr-2&quot; />
                    차단한 User 관리
                    <ChevronRight className=&quot;w-4 h-4 ml-auto&quot; />
                  </Button>
                  <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                    <Shield className=&quot;w-4 h-4 mr-2&quot; />
                    차단한 커뮤니티 관리
                    <ChevronRight className=&quot;w-4 h-4 ml-auto&quot; />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 환경설정 */}
          <TabsContent value=&quot;preferences&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>{t(&apos;settings.appPreferences&apos;, &apos;앱 환경설정&apos;)}</CardTitle>
                <CardDescription>
                  {t(&apos;settings.appPreferencesDescription&apos;, &apos;앱 사용 환경을 커스터마이즈하세요&apos;)}
                </CardDescription>
              </CardHeader>
              <CardContent className=&quot;space-y-6&quot;>
                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>{t(&apos;settings.darkModeLabel&apos;, &apos;다크 모드&apos;)}</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
                      {t(&apos;settings.darkModeDescription&apos;, &apos;어두운 테마를 사용합니다&apos;)}
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

                <div className=&quot;space-y-2&quot;>
                  <Label>{t(&apos;settings.languageLabel&apos;, &apos;언어&apos;)}</Label>
                  <p className=&quot;text-sm text-gray-500&quot;>
                    {t(&apos;settings.languageDescription&apos;, &apos;앱 메뉴의 기본 표시 언어를 선택하세요&apos;)}
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>{t(&apos;settings.autoTranslateLabel&apos;, &apos;자동 번역&apos;)}</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
                      {t(&apos;settings.autoTranslateDescription&apos;, &apos;선택한 언어로 게시물과 댓글을 자동으로 번역합니다&apos;)}
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

                <div className=&quot;flex items-center justify-between&quot;>
                  <div className=&quot;space-y-0.5&quot;>
                    <Label>{t(&apos;settings.autoPlayLabel&apos;, &apos;동영상 자동 재생&apos;)}</Label>
                    <p className=&quot;text-sm text-gray-500&quot;>
                      {t(&apos;settings.autoPlayDescription&apos;, &apos;피드의 동영상을 자동으로 재생합니다&apos;)}
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
                <CardTitle>{t(&apos;settings.premiumTitle&apos;, &apos;프리미엄 기능&apos;)}</CardTitle>
                <CardDescription>
                  {t(&apos;settings.premiumDescription&apos;, &apos;ddudl 프리미엄으로 더 많은 기능을 이용하세요&apos;)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className=&quot;border-amber-200 bg-amber-50&quot;>
                  <CreditCard className=&quot;h-4 w-4 text-amber-600&quot; />
                  <AlertDescription className=&quot;text-amber-800&quot;>
                    {t(&apos;settings.premiumBenefit&apos;, &apos;프리미엄 멤버십으로 광고 제거, 특별 배지, 우선 지원 등의 혜택을 받으세요!&apos;)}
                  </AlertDescription>
                </Alert>
                <Button className=&quot;w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600&quot;>
                  {t(&apos;settings.upgradeButton&apos;, &apos;프리미엄 업그레이드&apos;)}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 저장 버튼 */}
        <div className=&quot;mt-8 flex justify-end&quot;>
          <Button 
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <>
                <LoadingSpinner size=&quot;sm&quot; />
                <span className=&quot;ml-2&quot;>{t(&apos;settings.saving&apos;, &apos;저장 중...&apos;)}</span>
              </>
            ) : (
              t(&apos;settings.save&apos;, &apos;설정 저장&apos;)
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
