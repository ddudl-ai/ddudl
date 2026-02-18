'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, Lightbulb, X, Plus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function CreateCommunityPage() {
  const router = useRouter()
  const { isAdmin, initialize } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    reason: ''
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<Array<{ id: string, name: string, color: string }>>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    type: 'success' | 'error' | 'pending'
    message: string
    details?: string
  } | null>(null)

  useEffect(() => {
    initialize()
    fetchTags()
  }, [initialize])

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const addNewTag = () => {
    const trimmedTag = newTagInput.trim()
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags(prev => [...prev, trimmedTag])
      setNewTagInput('')
    }
  }

  const removeTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // 이름 유효성 검사
      if (!/^[a-zA-Z0-9_-]{2,20}$/.test(formData.name)) {
        throw new Error('Channel 이름은 2-20자의 영문, 숫자, _, - 만 사용 가능합니다.')
      }

      const response = await fetch('/api/channels/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData, // Keep existing formData fields
          tags: selectedTags // Keep tags if they are still part of the request
        }),
      })

      const data = await response.json()

      if (!response.ok) { // Check response.ok for HTTP errors
        throw new Error(data.message || data.error || '채널 만들기 신청에 실패했습니다.')
      }

      // Assuming the API response structure is similar to the original,
      // but adapting to the new success/pending logic from the provided snippet.
      if (data.status === 'approved' || data.success) {
        const channelName = data.channel?.name || formData.name // Use channel name from response or formData
        setResult({
          type: 'success',
          message: '축하합니다! Channel이 성공적으로 개설되었습니다!',
          details: channelName ? `3초 후 c/${channelName}로 이동합니다.` : '잠시 후 새 Channel으로 이동합니다.'
        })

        // 3초 후 새 Channel으로 이동
        if (channelName) {
          setTimeout(() => {
            router.push(`/c/${channelName}`)
          }, 3000)
        } else {
          // channel name이 없으면 홈으로
          setTimeout(() => {
            router.push('/')
          }, 3000)
        }
      } else if (data.status === 'pending_review') {
        setResult({
          type: 'pending',
          message: data.message,
          details: data.reviewReason
        })
      }
    } catch (error) {
      console.error('Create community error:', error)
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : '오류가 발생했습니다.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNameChange = (value: string) => {
    // 영문은 자동으로 소문자로 변환, 한글 제거
    const cleanValue = value.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '')
    setFormData(prev => ({ ...prev, name: cleanValue }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">새로운 Channel 만들기</h1>
        <p className="text-gray-600">
          관심사가 비슷한 사람들과 소통할 수 있는 커뮤니티를 만들어보세요.
        </p>
      </div>

      {result && (
        <Alert className={`mb-6 ${result.type === 'success' ? 'border-green-500 bg-green-50' :
            result.type === 'pending' ? 'border-yellow-500 bg-yellow-50' :
              'border-red-500 bg-red-50'
          }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {result.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {result.type === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
              {result.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <AlertDescription className="font-medium text-sm leading-relaxed break-keep">
                {result.message}
              </AlertDescription>
              {result.details && (
                <AlertDescription className="mt-2 text-sm opacity-90 leading-relaxed break-keep">
                  {result.details}
                </AlertDescription>
              )}
            </div>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Channel 정보
          </CardTitle>
          <CardDescription>
            AI가 자동으로 검토하여 적절한 Channel은 즉시 개설됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Channel 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="예: dev-talk, food-lovers, gaming-hub"
                maxLength={20}
                required
              />
              <p className="text-xs text-gray-500">
                2-20자, 영문/숫자/언더스코어/하이픈만 가능 (URL에서 k/{formData.name || 'your-community'}로 표시됩니다)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">표시 이름 *</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="개발자들의 Channel"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-500">
                Channel 목록에 표시될 이름입니다.
              </p>
            </div>

            <div className="space-y-3">
              <Label>태그 (최대 5개)</Label>

              {/* 선택된 태그들 */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => {
                    const tagData = availableTags.find(t => t.name === tag)
                    return (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-3 py-1 cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: tagData?.color + '20', color: tagData?.color || '#6b7280' }}
                      >
                        {tag}
                        <X
                          className="ml-1 w-3 h-3 hover:text-red-500"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* 기존 태그 선택 */}
              <div>
                <p className="text-sm text-gray-600 mb-2">추천 태그:</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                      className="cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: selectedTags.includes(tag.name) ? tag.color : 'transparent',
                        borderColor: tag.color,
                        color: selectedTags.includes(tag.name) ? 'white' : tag.color
                      }}
                      onClick={() => selectedTags.length < 5 && toggleTag(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 새 태그 추가 */}
              <div className="flex gap-2">
                <Input
                  placeholder="새 태그 입력..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTag())}
                  maxLength={20}
                  className="flex-1"
                  disabled={selectedTags.length >= 5}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewTag}
                  disabled={!newTagInput.trim() || selectedTags.length >= 5}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                관련 키워드를 태그로 추가하세요. 예: 피자 → 음식, 이탈리아
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Channel 설명 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="이 Channel에서 어떤 이야기를 나누고 싶나요? 구체적으로 설명해주세요."
                rows={4}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500">
                최소 20자 이상의 구체적인 설명이 필요합니다. ({formData.description.length}/500자)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">개설 이유 *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="왜 이 Channel을 만들고 싶으신가요? 어떤 커뮤니티를 만들어가고 싶은지 알려주세요."
                rows={3}
                maxLength={300}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.reason.length}/300자
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isAdmin ? 'bg-green-50' : 'bg-blue-50'}`}>
              <h4 className={`font-medium mb-2 ${isAdmin ? 'text-green-900' : 'text-blue-900'}`}>
                {isAdmin ? '👑 Admin 특권' : '📋 개설 조건'}
              </h4>
              {isAdmin ? (
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Admin는 모든 제한 없이 Channel 개설 가능</li>
                  <li>• AI 검토 통과 시 즉시 개설</li>
                  <li>• 부적절한 내용도 Admin 판단 하에 승인</li>
                </ul>
              ) : (
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 계정 생성 후 7일 이상</li>
                  <li>• 10+ Points required</li>
                  <li>• AI 검토 통과</li>
                  <li>• 건전하고 구체적인 목적</li>
                </ul>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !formData.name || !formData.displayName || !formData.description || !formData.reason}
            >
              {loading ? '검토 중...' : 'Channel 개설 신청'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}