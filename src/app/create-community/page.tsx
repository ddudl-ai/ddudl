'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Textarea } from &apos;@/components/ui/textarea&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { AlertCircle, CheckCircle, Clock, Lightbulb, X, Plus } from &apos;lucide-react&apos;
import { Alert, AlertDescription } from &apos;@/components/ui/alert&apos;

export default function CreateCommunityPage() {
  const router = useRouter()
  const { isAdmin, initialize } = useAuthStore()
  const [formData, setFormData] = useState({
    name: &apos;',
    displayName: &apos;',
    description: &apos;',
    reason: &apos;'
  })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<Array<{ id: string, name: string, color: string }>>([])
  const [newTagInput, setNewTagInput] = useState(&apos;')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    type: &apos;success&apos; | &apos;error&apos; | &apos;pending&apos;
    message: string
    details?: string
  } | null>(null)

  useEffect(() => {
    initialize()
    fetchTags()
  }, [initialize])

  const fetchTags = async () => {
    try {
      const response = await fetch(&apos;/api/tags&apos;)
      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error(&apos;Failed to fetch tags:&apos;, error)
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
      setNewTagInput(&apos;')
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
        throw new Error(&apos;Channel 이름은 2-20자의 영문, 숫자, _, - 만 사용 가능합니다.&apos;)
      }

      const response = await fetch(&apos;/api/channels/create&apos;, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
        },
        body: JSON.stringify({
          ...formData, // Keep existing formData fields
          tags: selectedTags // Keep tags if they are still part of the request
        }),
      })

      const data = await response.json()

      if (!response.ok) { // Check response.ok for HTTP errors
        throw new Error(data.message || data.error || &apos;채널 만들기 신청에 실패했습니다.&apos;)
      }

      // Assuming the API response structure is similar to the original,
      // but adapting to the new success/pending logic from the provided snippet.
      if (data.status === &apos;approved&apos; || data.success) {
        const channelName = data.channel?.name || formData.name // Use channel name from response or formData
        setResult({
          type: &apos;success&apos;,
          message: &apos;축하합니다! Channel이 성공적으로 개설되었습니다!&apos;,
          details: channelName ? `3초 후 c/${channelName}로 이동합니다.` : &apos;잠시 후 새 Channel으로 이동합니다.&apos;
        })

        // 3초 후 새 Channel으로 이동
        if (channelName) {
          setTimeout(() => {
            router.push(`/c/${channelName}`)
          }, 3000)
        } else {
          // channel name이 없으면 홈으로
          setTimeout(() => {
            router.push(&apos;/&apos;)
          }, 3000)
        }
      } else if (data.status === &apos;pending_review&apos;) {
        setResult({
          type: &apos;pending&apos;,
          message: data.message,
          details: data.reviewReason
        })
      }
    } catch (error) {
      console.error(&apos;Create community error:&apos;, error)
      setResult({
        type: &apos;error&apos;,
        message: error instanceof Error ? error.message : &apos;오류가 발생했습니다.&apos;
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNameChange = (value: string) => {
    // 영문은 자동으로 소문자로 변환, 한글 제거
    const cleanValue = value.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, &apos;')
    setFormData(prev => ({ ...prev, name: cleanValue }))
  }

  return (
    <div className=&quot;container mx-auto px-4 py-8 max-w-2xl&quot;>
      <div className=&quot;mb-8&quot;>
        <h1 className=&quot;text-3xl font-bold mb-2&quot;>새로운 Channel 만들기</h1>
        <p className=&quot;text-gray-600&quot;>
          관심사가 비슷한 사람들과 소통할 수 있는 커뮤니티를 만들어보세요.
        </p>
      </div>

      {result && (
        <Alert className={`mb-6 ${result.type === &apos;success&apos; ? &apos;border-green-500 bg-green-50&apos; :
            result.type === &apos;pending&apos; ? &apos;border-yellow-500 bg-yellow-50&apos; :
              &apos;border-red-500 bg-red-50&apos;
          }`}>
          <div className=&quot;flex items-start gap-3&quot;>
            <div className=&quot;flex-shrink-0 mt-0.5&quot;>
              {result.type === &apos;success&apos; && <CheckCircle className=&quot;w-5 h-5 text-green-600&quot; />}
              {result.type === &apos;pending&apos; && <Clock className=&quot;w-5 h-5 text-yellow-600&quot; />}
              {result.type === &apos;error&apos; && <AlertCircle className=&quot;w-5 h-5 text-red-600&quot; />}
            </div>
            <div className=&quot;flex-1 min-w-0&quot;>
              <AlertDescription className=&quot;font-medium text-sm leading-relaxed break-keep&quot;>
                {result.message}
              </AlertDescription>
              {result.details && (
                <AlertDescription className=&quot;mt-2 text-sm opacity-90 leading-relaxed break-keep&quot;>
                  {result.details}
                </AlertDescription>
              )}
            </div>
          </div>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className=&quot;flex items-center gap-2&quot;>
            <Lightbulb className=&quot;w-5 h-5&quot; />
            Channel 정보
          </CardTitle>
          <CardDescription>
            AI가 자동으로 검토하여 적절한 Channel은 즉시 개설됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className=&quot;space-y-6&quot;>
            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;name&quot;>Channel 이름 *</Label>
              <Input
                id=&quot;name&quot;
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder=&quot;예: dev-talk, food-lovers, gaming-hub&quot;
                maxLength={20}
                required
              />
              <p className=&quot;text-xs text-gray-500&quot;>
                2-20자, 영문/숫자/언더스코어/하이픈만 가능 (URL에서 k/{formData.name || &apos;your-community&apos;}로 표시됩니다)
              </p>
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;displayName&quot;>표시 이름 *</Label>
              <Input
                id=&quot;displayName&quot;
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder=&quot;개발자들의 Channel&quot;
                maxLength={50}
                required
              />
              <p className=&quot;text-xs text-gray-500&quot;>
                Channel 목록에 표시될 이름입니다.
              </p>
            </div>

            <div className=&quot;space-y-3&quot;>
              <Label>태그 (최대 5개)</Label>

              {/* 선택된 태그들 */}
              {selectedTags.length > 0 && (
                <div className=&quot;flex flex-wrap gap-2&quot;>
                  {selectedTags.map((tag) => {
                    const tagData = availableTags.find(t => t.name === tag)
                    return (
                      <Badge
                        key={tag}
                        variant=&quot;secondary&quot;
                        className=&quot;px-3 py-1 cursor-pointer hover:opacity-80&quot;
                        style={{ backgroundColor: tagData?.color + &apos;20&apos;, color: tagData?.color || &apos;#6b7280&apos; }}
                      >
                        {tag}
                        <X
                          className=&quot;ml-1 w-3 h-3 hover:text-red-500&quot;
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* 기존 태그 선택 */}
              <div>
                <p className=&quot;text-sm text-gray-600 mb-2&quot;>추천 태그:</p>
                <div className=&quot;flex flex-wrap gap-2 max-h-32 overflow-y-auto&quot;>
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.name) ? &quot;default&quot; : &quot;outline&quot;}
                      className=&quot;cursor-pointer hover:opacity-80&quot;
                      style={{
                        backgroundColor: selectedTags.includes(tag.name) ? tag.color : &apos;transparent&apos;,
                        borderColor: tag.color,
                        color: selectedTags.includes(tag.name) ? &apos;white&apos; : tag.color
                      }}
                      onClick={() => selectedTags.length < 5 && toggleTag(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 새 태그 추가 */}
              <div className=&quot;flex gap-2&quot;>
                <Input
                  placeholder=&quot;새 태그 입력...&quot;
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === &apos;Enter&apos; && (e.preventDefault(), addNewTag())}
                  maxLength={20}
                  className=&quot;flex-1&quot;
                  disabled={selectedTags.length >= 5}
                />
                <Button
                  type=&quot;button&quot;
                  variant=&quot;outline&quot;
                  size=&quot;sm&quot;
                  onClick={addNewTag}
                  disabled={!newTagInput.trim() || selectedTags.length >= 5}
                >
                  <Plus className=&quot;w-4 h-4&quot; />
                </Button>
              </div>
              <p className=&quot;text-xs text-gray-500&quot;>
                관련 키워드를 태그로 추가하세요. 예: 피자 → 음식, 이탈리아
              </p>
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;description&quot;>Channel 설명 *</Label>
              <Textarea
                id=&quot;description&quot;
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder=&quot;이 Channel에서 어떤 이야기를 나누고 싶나요? 구체적으로 설명해주세요.&quot;
                rows={4}
                maxLength={500}
                required
              />
              <p className=&quot;text-xs text-gray-500&quot;>
                최소 20자 이상의 구체적인 설명이 필요합니다. ({formData.description.length}/500자)
              </p>
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;reason&quot;>개설 이유 *</Label>
              <Textarea
                id=&quot;reason&quot;
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder=&quot;왜 이 Channel을 만들고 싶으신가요? 어떤 커뮤니티를 만들어가고 싶은지 알려주세요.&quot;
                rows={3}
                maxLength={300}
                required
              />
              <p className=&quot;text-xs text-gray-500&quot;>
                {formData.reason.length}/300자
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isAdmin ? &apos;bg-green-50&apos; : &apos;bg-blue-50&apos;}`}>
              <h4 className={`font-medium mb-2 ${isAdmin ? &apos;text-green-900&apos; : &apos;text-blue-900&apos;}`}>
                {isAdmin ? &apos;👑 Admin 특권&apos; : &apos;📋 개설 조건&apos;}
              </h4>
              {isAdmin ? (
                <ul className=&quot;text-sm text-green-800 space-y-1&quot;>
                  <li>• Admin는 모든 제한 없이 Channel 개설 가능</li>
                  <li>• AI 검토 통과 시 즉시 개설</li>
                  <li>• 부적절한 내용도 Admin 판단 하에 승인</li>
                </ul>
              ) : (
                <ul className=&quot;text-sm text-blue-800 space-y-1&quot;>
                  <li>• 계정 생성 후 7일 이상</li>
                  <li>• 10+ Points required</li>
                  <li>• AI 검토 통과</li>
                  <li>• 건전하고 구체적인 목적</li>
                </ul>
              )}
            </div>

            <Button
              type=&quot;submit&quot;
              className=&quot;w-full&quot;
              disabled={loading || !formData.name || !formData.displayName || !formData.description || !formData.reason}
            >
              {loading ? &apos;검토 중...&apos; : &apos;Channel 개설 신청&apos;}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}