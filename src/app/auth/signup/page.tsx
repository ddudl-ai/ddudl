'use client&apos;

import { useState } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import Link from &apos;next/link&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Alert, AlertDescription } from &apos;@/components/ui/alert&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { Checkbox } from &apos;@/components/ui/checkbox&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { AlertTriangle, CheckCircle, Eye, EyeOff, ExternalLink } from &apos;lucide-react&apos;
import TermsModal from &apos;@/components/auth/TermsModal&apos;

export default function SignUpPage() {
  const [email, setEmail] = useState(&apos;')
  const [password, setPassword] = useState(&apos;')
  const [confirmPassword, setConfirmPassword] = useState(&apos;')
  const [username, setUsername] = useState(&apos;')
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
  const [modalType, setModalType] = useState<&apos;terms&apos; | &apos;privacy&apos; | &apos;ai_training&apos; | &apos;marketing&apos;>(&apos;terms&apos;)
  
  const { signUp } = useAuthStore()
  const router = useRouter()

  const validateForm = () => {
    if (!email || !password || !username || !confirmPassword) {
      setError(&apos;Please fill in all fields.&apos;)
      return false
    }

    if (username.length < 3) {
      setError(&apos;Username must be at least 3 characters.&apos;)
      return false
    }

    if (password.length < 6) {
      setError(&apos;Password must be at least 6 characters.&apos;)
      return false
    }

    if (password !== confirmPassword) {
      setError(&apos;Passwords do not match.&apos;)
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(&apos;Please enter a valid email address.&apos;)
      return false
    }

    if (!termsAccepted) {
      setError(&apos;Please accept the Terms of Service.&apos;)
      return false
    }

    if (!privacyAccepted) {
      setError(&apos;Please accept the Privacy Policy.&apos;)
      return false
    }

    if (!aiTrainingAccepted) {
      setError(&apos;Please agree to AI training data provision.&apos;)
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

        const consentResponse = await fetch(&apos;/api/auth/consents&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify(consentData)
        })

        if (!consentResponse.ok) {
          console.error(&apos;Failed to record consent, but user created successfully&apos;)
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(&apos;/&apos;)
        }, 2000)
      } else {
        setError(result.error || &apos;Sign up failed.&apos;)
      }
    } catch (err) {
      setError(&apos;An unknown error occurred.&apos;)
    } finally {
      setIsLoading(false)
    }
  }

  const openModal = (type: &apos;terms&apos; | &apos;privacy&apos; | &apos;ai_training&apos; | &apos;marketing&apos;) => {
    setModalType(type)
    setModalOpen(true)
  }

  if (success) {
    return (
      <div className=&quot;min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8&quot;>
        <Card className=&quot;w-full max-w-md&quot;>
          <CardContent className=&quot;pt-6&quot;>
            <div className=&quot;text-center&quot;>
              <CheckCircle className=&quot;mx-auto h-12 w-12 text-green-500&quot; />
              <h2 className=&quot;mt-4 text-xl font-bold&quot;>Sign up complete!</h2>
              <p className=&quot;mt-2 text-gray-600&quot;>
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
    <div className=&quot;min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8&quot;>
      <Card className=&quot;w-full max-w-md&quot;>
        <CardHeader className=&quot;text-center&quot;>
          <div className=&quot;flex items-center justify-center mb-4&quot;>
            <div className=&quot;w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center&quot;>
              <span className=&quot;text-white font-bold text-lg&quot;>D</span>
            </div>
          </div>
          <CardTitle className=&quot;text-2xl font-bold&quot;>Join ddudl</CardTitle>
          <CardDescription>
            Join the ddudl community
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className=&quot;space-y-4&quot;>
            {error && (
              <Alert variant=&quot;destructive&quot;>
                <AlertTriangle className=&quot;h-4 w-4&quot; />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;username&quot;>Username</Label>
              <Input
                id=&quot;username&quot;
                type=&quot;text&quot;
                placeholder=&quot;Username (min 3 chars)&quot;
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                maxLength={20}
              />
              <p className=&quot;text-xs text-gray-500&quot;>
                {username.length}/20 (min 3 chars)
              </p>
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;email&quot;>Email</Label>
              <Input
                id=&quot;email&quot;
                type=&quot;email&quot;
                placeholder=&quot;Email address&quot;
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;password&quot;>Password</Label>
              <div className=&quot;relative&quot;>
                <Input
                  id=&quot;password&quot;
                  type={showPassword ? &quot;text&quot; : &quot;password&quot;}
                  placeholder=&quot;Password (min 6 chars)&quot;
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type=&quot;button&quot;
                  variant=&quot;ghost&quot;
                  size=&quot;sm&quot;
                  className=&quot;absolute right-0 top-0 h-full px-3&quot;
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className=&quot;h-4 w-4&quot; /> : <Eye className=&quot;h-4 w-4&quot; />}
                </Button>
              </div>
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;confirmPassword&quot;>Confirm Password</Label>
              <div className=&quot;relative&quot;>
                <Input
                  id=&quot;confirmPassword&quot;
                  type={showConfirmPassword ? &quot;text&quot; : &quot;password&quot;}
                  placeholder=&quot;Re-enter password&quot;
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type=&quot;button&quot;
                  variant=&quot;ghost&quot;
                  size=&quot;sm&quot;
                  className=&quot;absolute right-0 top-0 h-full px-3&quot;
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className=&quot;h-4 w-4&quot; /> : <Eye className=&quot;h-4 w-4&quot; />}
                </Button>
              </div>
            </div>

            {/* 약관 동의 섹션 */}
            <div className=&quot;space-y-4 pt-4 border-t&quot;>
              <div className=&quot;space-y-3&quot;>
                {/* 이용약관 동의 */}
                <div className=&quot;flex items-start space-x-2&quot;>
                  <Checkbox
                    id=&quot;terms&quot;
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className=&quot;grid gap-1.5 leading-none&quot;>
                    <label
                      htmlFor=&quot;terms&quot;
                      className=&quot;text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70&quot;
                    >
                      <span className=&quot;text-red-500&quot;>*</span> Accept Terms of Service <span className=&quot;text-red-500&quot;>(Required)</span>
                    </label>
                    <button
                      type=&quot;button&quot;
                      onClick={() => openModal(&apos;terms&apos;)}
                      className=&quot;text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center&quot;
                      disabled={isLoading}
                    >
                      View Terms of Service <ExternalLink className=&quot;w-3 h-3 ml-1&quot; />
                    </button>
                  </div>
                </div>

                {/* 개인정보처리방침 동의 */}
                <div className=&quot;flex items-start space-x-2&quot;>
                  <Checkbox
                    id=&quot;privacy&quot;
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className=&quot;grid gap-1.5 leading-none&quot;>
                    <label
                      htmlFor=&quot;privacy&quot;
                      className=&quot;text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70&quot;
                    >
                      <span className=&quot;text-red-500&quot;>*</span> Accept Privacy Policy <span className=&quot;text-red-500&quot;>(Required)</span>
                    </label>
                    <button
                      type=&quot;button&quot;
                      onClick={() => openModal(&apos;privacy&apos;)}
                      className=&quot;text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center&quot;
                      disabled={isLoading}
                    >
                      View Privacy Policy <ExternalLink className=&quot;w-3 h-3 ml-1&quot; />
                    </button>
                  </div>
                </div>

                {/* AI 학습 데이터 제공 동의 */}
                <div className=&quot;flex items-start space-x-2&quot;>
                  <Checkbox
                    id=&quot;ai_training&quot;
                    checked={aiTrainingAccepted}
                    onCheckedChange={(checked) => setAiTrainingAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className=&quot;grid gap-1.5 leading-none&quot;>
                    <label
                      htmlFor=&quot;ai_training&quot;
                      className=&quot;text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70&quot;
                    >
                      <span className=&quot;text-red-500&quot;>*</span> AI Training Data Consent <span className=&quot;text-red-500&quot;>(Required)</span>
                    </label>
                    <button
                      type=&quot;button&quot;
                      onClick={() => openModal(&apos;ai_training&apos;)}
                      className=&quot;text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center&quot;
                      disabled={isLoading}
                    >
                      View AI Training Data Consent <ExternalLink className=&quot;w-3 h-3 ml-1&quot; />
                    </button>
                  </div>
                </div>

                {/* 마케팅 정보 수신 동의 */}
                <div className=&quot;flex items-start space-x-2&quot;>
                  <Checkbox
                    id=&quot;marketing&quot;
                    checked={marketingAccepted}
                    onCheckedChange={(checked) => setMarketingAccepted(checked === true)}
                    disabled={isLoading}
                  />
                  <div className=&quot;grid gap-1.5 leading-none&quot;>
                    <label
                      htmlFor=&quot;marketing&quot;
                      className=&quot;text-sm font-medium leading-none text-gray-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70&quot;
                    >
                      Marketing Communications <span className=&quot;text-gray-500&quot;>(Optional)</span>
                    </label>
                    <button
                      type=&quot;button&quot;
                      onClick={() => openModal(&apos;marketing&apos;)}
                      className=&quot;text-xs text-blue-600 hover:text-blue-800 underline text-left flex items-center&quot;
                      disabled={isLoading}
                    >
                      View Marketing Consent <ExternalLink className=&quot;w-3 h-3 ml-1&quot; />
                    </button>
                  </div>
                </div>
              </div>

              <div className=&quot;text-xs text-gray-700 bg-gray-50 p-3 rounded-md&quot;>
                <p className=&quot;mb-1&quot;>
                  <span className=&quot;text-red-500&quot;>*</span> Items marked with * are required to use the service.
                </p>
                <p>
                  Marketing communications are optional and won&apos;t affect your use of the service.
                </p>
              </div>
            </div>

            <Button
              type=&quot;submit&quot;
              className=&quot;w-full&quot;
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size=&quot;sm&quot; />
                  <span className=&quot;ml-2&quot;>Signing up...</span>
                </>
              ) : (
                &apos;Sign Up&apos;
              )}
            </Button>
          </form>

          <div className=&quot;mt-6 text-center&quot;>
            <p className=&quot;text-sm text-gray-600&quot;>
              Already have an account?{&apos; &apos;}
              <Link href=&quot;/auth/signin&quot; className=&quot;text-orange-600 hover:text-orange-500 font-medium&quot;>
                Sign in
              </Link>
            </p>
          </div>

          <div className=&quot;mt-4 text-center&quot;>
            <Link href=&quot;/&quot; className=&quot;text-sm text-gray-500 hover:text-gray-700&quot;>
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