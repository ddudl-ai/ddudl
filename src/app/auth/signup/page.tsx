'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useAuthStore } from '@/stores/authStore'
import { AlertTriangle, CheckCircle, Eye, EyeOff, ExternalLink } from 'lucide-react'
import TermsModal from '@/components/auth/TermsModal'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // 약관 동의 상태
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [aiTrainingAccepted, setAiTrainingAccepted] = useState(false)
  const [marketingAccepted, setMarketingAccepted] = useState(false)
  
  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'terms' | 'privacy' | 'ai_training' | 'marketing'>('terms')
  
  const { signUp } = useAuthStore()
  const router = useRouter()

  const validateForm = () => {
    if (!email || !password || !username || !confirmPassword) {
      setError('Please fill in all fields.')
      return false
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return false
    }

    if (!termsAccepted) {
      setError('Please accept the Terms of Service.')
      return false
    }

    if (!privacyAccepted) {
      setError('Please accept the Privacy Policy.')
      return false
    }

    if (!aiTrainingAccepted) {
      setError('Please agree to AI training data provision.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await signUp(email, password, username)
      
      if (result.success) {
        // 약관 동의 기록 - 이메일로 처리
        const consentData = {
          email,
          termsAccepted,
          privacyAccepted,
          aiTrainingAccepted,
          marketingAccepted,
          userAgent: navigator.userAgent
        }

        const consentResponse = await fetch('/api/auth/consents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(consentData)
        })

        if (!consentResponse.ok) {
          console.error('Failed to record consent, but user created successfully')
        }

        setSuccess(true)
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        setError(result.error || 'Sign up failed.')
      }
    } catch (err) {
      setError('An unknown error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const openModal = (type: 'terms' | 'privacy' | 'ai_training' | 'marketing') => {
    setModalType(type)
    setModalOpen(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-xl font-bold">Sign up complete!</h2>
              <p className="mt-2 text-gray-600">
                Welcome to ddudl!<br />
                Redirecting to the main page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Join ddudl</CardTitle>
          <CardDescription>
            Join the ddudl community
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Username (min 3 chars)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                maxLength={20}
              />
              <p className="text-xs text-gray-500">
                {username.length}/20 (min 3 chars)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 약관 동의 섹션 */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-3">
                {/* 이용약관 동의 */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <span className="text-red-500">*</span> Accept Terms of Service <span className="text-red-500">(Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openModal('terms')}
                      className="text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center"
                      disabled={isLoading}
                    >
                      View Terms of Service <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>

                {/* 개인정보처리방침 동의 */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="privacy"
                      className="text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <span className="text-red-500">*</span> Accept Privacy Policy <span className="text-red-500">(Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openModal('privacy')}
                      className="text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center"
                      disabled={isLoading}
                    >
                      View Privacy Policy <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>

                {/* AI 학습 데이터 제공 동의 */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="ai_training"
                    checked={aiTrainingAccepted}
                    onCheckedChange={(checked) => setAiTrainingAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="ai_training"
                      className="text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <span className="text-red-500">*</span> AI Training Data Consent <span className="text-red-500">(Required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openModal('ai_training')}
                      className="text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center"
                      disabled={isLoading}
                    >
                      View AI Training Data Consent <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>

                {/* 마케팅 정보 수신 동의 */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketing"
                    checked={marketingAccepted}
                    onCheckedChange={(checked) => setMarketingAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="marketing"
                      className="text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Marketing Communications <span className="text-gray-500">(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => openModal('marketing')}
                      className="text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center"
                      disabled={isLoading}
                    >
                      View Marketing Consent <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded-md">
                <p className="mb-1">
                  <span className="text-red-500">*</span> Items marked with * are required to use the service.
                </p>
                <p>
                  Marketing communications are optional and won't affect your use of the service.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Signing up...</span>
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-orange-600 hover:text-orange-500 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 약관 모달 */}
      <TermsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={modalType}
      />
    </div>
  )
}