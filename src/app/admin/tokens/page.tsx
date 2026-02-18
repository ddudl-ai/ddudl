'use client&apos;

import { useEffect, useState } from &apos;react&apos;
import { createClientComponentClient } from &apos;@supabase/auth-helpers-nextjs&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { Switch } from &apos;@/components/ui/switch&apos;
import { useToast } from &apos;@/hooks/use-toast&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Coins, Save, RefreshCw } from &apos;lucide-react&apos;

interface TokenSetting {
  id: string
  action_type: string
  category: &apos;earn&apos; | &apos;spend&apos;
  amount: number
  description: string
  is_active: boolean
  min_user_level: number
  cooldown_minutes: number
  daily_limit: number | null
  created_at: string
  updated_at: string
}

export default function AdminTokensPage() {
  const [earnSettings, setEarnSettings] = useState<TokenSetting[]>([])
  const [spendSettings, setSpendSettings] = useState<TokenSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || &apos;https://example.supabase.co&apos;,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || &apos;dummy-key-for-build&apos;
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(&apos;token_settings&apos;)
        .select(&apos;*&apos;)
        .order(&apos;category&apos;, { ascending: true })
        .order(&apos;amount&apos;, { ascending: true })

      if (error) throw error

      const earn = data.filter((s: TokenSetting) => s.category === &apos;earn&apos;)
      const spend = data.filter((s: TokenSetting) => s.category === &apos;spend&apos;)

      setEarnSettings(earn)
      setSpendSettings(spend)
    } catch (error) {
      console.error(&apos;Error fetching settings:&apos;, error)
      toast({
        title: &apos;오류&apos;,
        description: &apos;설정을 불러오는데 실패했습니다.&apos;,
        variant: &apos;destructive&apos;
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (setting: TokenSetting) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from(&apos;token_settings&apos;)
        .update({
          amount: setting.amount,
          description: setting.description,
          is_active: setting.is_active,
          min_user_level: setting.min_user_level,
          cooldown_minutes: setting.cooldown_minutes,
          daily_limit: setting.daily_limit
        })
        .eq(&apos;id&apos;, setting.id)

      if (error) throw error

      toast({
        title: &apos;성공&apos;,
        description: `${setting.action_type} 설정이 업데이트되었습니다.`
      })
    } catch (error) {
      console.error(&apos;Error updating setting:&apos;, error)
      toast({
        title: &apos;오류&apos;,
        description: &apos;설정 업데이트에 실패했습니다.&apos;,
        variant: &apos;destructive&apos;
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (
    settingId: string,
    field: keyof TokenSetting,
    value: any,
    category: &apos;earn&apos; | &apos;spend&apos;
  ) => {
    const updateFunction = category === &apos;earn&apos; ? setEarnSettings : setSpendSettings
    const settings = category === &apos;earn&apos; ? earnSettings : spendSettings

    updateFunction(
      settings.map(s =>
        s.id === settingId
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  const SettingCard = ({ setting, category }: { setting: TokenSetting; category: &apos;earn&apos; | &apos;spend&apos; }) => (
    <Card>
      <CardHeader>
        <div className=&quot;flex items-center justify-between&quot;>
          <CardTitle className=&quot;text-lg&quot;>{setting.action_type}</CardTitle>
          <Switch
            checked={setting.is_active}
            onCheckedChange={(checked) =>
              handleSettingChange(setting.id, &apos;is_active&apos;, checked, category)
            }
          />
        </div>
        <CardDescription>{setting.description}</CardDescription>
      </CardHeader>
      <CardContent className=&quot;space-y-4&quot;>
        <div className=&quot;grid grid-cols-2 gap-4&quot;>
          <div>
            <Label htmlFor={`amount-${setting.id}`}>Token 금액</Label>
            <div className=&quot;flex items-center gap-2&quot;>
              <Input
                id={`amount-${setting.id}`}
                type=&quot;number&quot;
                value={setting.amount}
                onChange={(e) =>
                  handleSettingChange(setting.id, &apos;amount&apos;, parseInt(e.target.value), category)
                }
                className=&quot;w-24&quot;
              />
              <Coins className=&quot;w-4 h-4 text-muted-foreground&quot; />
            </div>
          </div>

          {category === &apos;spend&apos; && (
            <div>
              <Label htmlFor={`level-${setting.id}`}>최소 레벨</Label>
              <Input
                id={`level-${setting.id}`}
                type=&quot;number&quot;
                value={setting.min_user_level}
                onChange={(e) =>
                  handleSettingChange(setting.id, &apos;min_user_level&apos;, parseInt(e.target.value), category)
                }
                className=&quot;w-24&quot;
              />
            </div>
          )}

          <div>
            <Label htmlFor={`cooldown-${setting.id}`}>재사용 대기(분)</Label>
            <Input
              id={`cooldown-${setting.id}`}
              type=&quot;number&quot;
              value={setting.cooldown_minutes}
              onChange={(e) =>
                handleSettingChange(setting.id, &apos;cooldown_minutes&apos;, parseInt(e.target.value), category)
              }
              className=&quot;w-24&quot;
            />
          </div>

          <div>
            <Label htmlFor={`limit-${setting.id}`}>일일 제한</Label>
            <Input
              id={`limit-${setting.id}`}
              type=&quot;number&quot;
              value={setting.daily_limit || &apos;'}
              onChange={(e) =>
                handleSettingChange(setting.id, &apos;daily_limit&apos;, e.target.value ? parseInt(e.target.value) : null, category)
              }
              placeholder=&quot;무제한&quot;
              className=&quot;w-24&quot;
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`desc-${setting.id}`}>설명</Label>
          <Input
            id={`desc-${setting.id}`}
            value={setting.description}
            onChange={(e) =>
              handleSettingChange(setting.id, &apos;description&apos;, e.target.value, category)
            }
          />
        </div>

        <Button
          onClick={() => updateSetting(setting)}
          disabled={saving}
          size=&quot;sm&quot;
          className=&quot;w-full&quot;
        >
          <Save className=&quot;w-4 h-4 mr-2&quot; />
          저장
        </Button>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className=&quot;flex items-center justify-center min-h-screen&quot;>
        <RefreshCw className=&quot;w-8 h-8 animate-spin&quot; />
      </div>
    )
  }

  return (
    <div className=&quot;container mx-auto p-6&quot;>
      <div className=&quot;flex items-center justify-between mb-6&quot;>
        <div>
          <h1 className=&quot;text-3xl font-bold&quot;>Token 설정 관리</h1>
          <p className=&quot;text-muted-foreground&quot;>
            User가 Token을 획득하고 사용하는 모든 액션의 금액을 설정합니다.
          </p>
        </div>
        <Button onClick={fetchSettings} variant=&quot;outline&quot;>
          <RefreshCw className=&quot;w-4 h-4 mr-2&quot; />
          새로고침
        </Button>
      </div>

      <Tabs defaultValue=&quot;earn&quot; className=&quot;space-y-4&quot;>
        <TabsList className=&quot;grid w-full grid-cols-2&quot;>
          <TabsTrigger value=&quot;earn&quot;>
            Token 획득 설정
            <Badge className=&quot;ml-2&quot; variant=&quot;secondary&quot;>{earnSettings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value=&quot;spend&quot;>
            Token 사용 설정
            <Badge className=&quot;ml-2&quot; variant=&quot;secondary&quot;>{spendSettings.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value=&quot;earn&quot; className=&quot;space-y-4&quot;>
          <div className=&quot;grid gap-4 md:grid-cols-2&quot;>
            {earnSettings.map(setting => (
              <SettingCard key={setting.id} setting={setting} category=&quot;earn&quot; />
            ))}
          </div>
        </TabsContent>

        <TabsContent value=&quot;spend&quot; className=&quot;space-y-4&quot;>
          <div className=&quot;grid gap-4 md:grid-cols-2&quot;>
            {spendSettings.map(setting => (
              <SettingCard key={setting.id} setting={setting} category=&quot;spend&quot; />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}