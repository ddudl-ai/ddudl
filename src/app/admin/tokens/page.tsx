'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Coins, Save, RefreshCw } from 'lucide-react'

interface TokenSetting {
  id: string
  action_type: string
  category: 'earn' | 'spend'
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
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('token_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('amount', { ascending: true })

      if (error) throw error

      const earn = data.filter((s: TokenSetting) => s.category === 'earn')
      const spend = data.filter((s: TokenSetting) => s.category === 'spend')

      setEarnSettings(earn)
      setSpendSettings(spend)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast({
        title: '오류',
        description: '설정을 불러오는데 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (setting: TokenSetting) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('token_settings')
        .update({
          amount: setting.amount,
          description: setting.description,
          is_active: setting.is_active,
          min_user_level: setting.min_user_level,
          cooldown_minutes: setting.cooldown_minutes,
          daily_limit: setting.daily_limit
        })
        .eq('id', setting.id)

      if (error) throw error

      toast({
        title: '성공',
        description: `${setting.action_type} 설정이 업데이트되었습니다.`
      })
    } catch (error) {
      console.error('Error updating setting:', error)
      toast({
        title: '오류',
        description: '설정 업데이트에 실패했습니다.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (
    settingId: string,
    field: keyof TokenSetting,
    value: any,
    category: 'earn' | 'spend'
  ) => {
    const updateFunction = category === 'earn' ? setEarnSettings : setSpendSettings
    const settings = category === 'earn' ? earnSettings : spendSettings

    updateFunction(
      settings.map(s =>
        s.id === settingId
          ? { ...s, [field]: value }
          : s
      )
    )
  }

  const SettingCard = ({ setting, category }: { setting: TokenSetting; category: 'earn' | 'spend' }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{setting.action_type}</CardTitle>
          <Switch
            checked={setting.is_active}
            onCheckedChange={(checked) =>
              handleSettingChange(setting.id, 'is_active', checked, category)
            }
          />
        </div>
        <CardDescription>{setting.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`amount-${setting.id}`}>Token 금액</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`amount-${setting.id}`}
                type="number"
                value={setting.amount}
                onChange={(e) =>
                  handleSettingChange(setting.id, 'amount', parseInt(e.target.value), category)
                }
                className="w-24"
              />
              <Coins className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {category === 'spend' && (
            <div>
              <Label htmlFor={`level-${setting.id}`}>최소 레벨</Label>
              <Input
                id={`level-${setting.id}`}
                type="number"
                value={setting.min_user_level}
                onChange={(e) =>
                  handleSettingChange(setting.id, 'min_user_level', parseInt(e.target.value), category)
                }
                className="w-24"
              />
            </div>
          )}

          <div>
            <Label htmlFor={`cooldown-${setting.id}`}>재사용 대기(분)</Label>
            <Input
              id={`cooldown-${setting.id}`}
              type="number"
              value={setting.cooldown_minutes}
              onChange={(e) =>
                handleSettingChange(setting.id, 'cooldown_minutes', parseInt(e.target.value), category)
              }
              className="w-24"
            />
          </div>

          <div>
            <Label htmlFor={`limit-${setting.id}`}>일일 제한</Label>
            <Input
              id={`limit-${setting.id}`}
              type="number"
              value={setting.daily_limit || ''}
              onChange={(e) =>
                handleSettingChange(setting.id, 'daily_limit', e.target.value ? parseInt(e.target.value) : null, category)
              }
              placeholder="무제한"
              className="w-24"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`desc-${setting.id}`}>설명</Label>
          <Input
            id={`desc-${setting.id}`}
            value={setting.description}
            onChange={(e) =>
              handleSettingChange(setting.id, 'description', e.target.value, category)
            }
          />
        </div>

        <Button
          onClick={() => updateSetting(setting)}
          disabled={saving}
          size="sm"
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          저장
        </Button>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Token 설정 관리</h1>
          <p className="text-muted-foreground">
            User가 Token을 획득하고 사용하는 모든 액션의 금액을 설정합니다.
          </p>
        </div>
        <Button onClick={fetchSettings} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Tabs defaultValue="earn" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earn">
            Token 획득 설정
            <Badge className="ml-2" variant="secondary">{earnSettings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="spend">
            Token 사용 설정
            <Badge className="ml-2" variant="secondary">{spendSettings.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earn" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {earnSettings.map(setting => (
              <SettingCard key={setting.id} setting={setting} category="earn" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="spend" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {spendSettings.map(setting => (
              <SettingCard key={setting.id} setting={setting} category="spend" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}