'use client&apos;

import { useState } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import Link from &apos;next/link&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Alert, AlertDescription } from &apos;@/components/ui/alert&apos;
import { Label } from &apos;@/components/ui/label&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { AlertTriangle, Eye, EyeOff } from &apos;lucide-react&apos;

export default function SignInPage() {
  const [email, setEmail] = useState(&apos;')
  const [password, setPassword] = useState(&apos;')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signIn } = useAuthStore()
  const router = useRouter()

  const validateForm = () => {
    if (!email || !password) {
      setError(&apos;Please enter your email and password.&apos;)
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(&apos;Please enter a valid email address.&apos;)
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
      const result = await signIn(email, password)
      
      if (result.success) {
        router.push(&apos;/&apos;)
      } else {
        setError(result.error || &apos;Login failed.&apos;)
      }
    } catch (err) {
      setError(&apos;An unknown error occurred.&apos;)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnonymousAccess = () => {
    router.push(&apos;/&apos;)
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
          <CardTitle className=&quot;text-2xl font-bold&quot;>Login to ddudl</CardTitle>
          <CardDescription>
            Sign in to your account to access more features
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
              <Label htmlFor=&quot;email&quot;>Email</Label>
              <Input
                id=&quot;email&quot;
                type=&quot;email&quot;
                placeholder=&quot;Email address&quot;
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete=&quot;email&quot;
              />
            </div>

            <div className=&quot;space-y-2&quot;>
              <Label htmlFor=&quot;password&quot;>Password</Label>
              <div className=&quot;relative&quot;>
                <Input
                  id=&quot;password&quot;
                  type={showPassword ? &quot;text&quot; : &quot;password&quot;}
                  placeholder=&quot;Password&quot;
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete=&quot;current-password&quot;
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

            <Button
              type=&quot;submit&quot;
              className=&quot;w-full&quot;
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size=&quot;sm&quot; />
                  <span className=&quot;ml-2&quot;>Signing in...</span>
                </>
              ) : (
                &apos;Sign In&apos;
              )}
            </Button>
          </form>

          <div className=&quot;mt-6&quot;>
            <div className=&quot;relative&quot;>
              <div className=&quot;absolute inset-0 flex items-center&quot;>
                <div className=&quot;w-full border-t border-gray-300&quot; />
              </div>
              <div className=&quot;relative flex justify-center text-sm&quot;>
                <span className=&quot;px-2 bg-white text-gray-500&quot;>or</span>
              </div>
            </div>

          </div>

          <div className=&quot;mt-6 text-center&quot;>
            <p className=&quot;text-sm text-gray-600&quot;>
              New here?{&apos; &apos;}
              <Link href=&quot;/join&quot; className=&quot;text-orange-600 hover:text-orange-500 font-medium&quot;>
                Join now
              </Link>
            </p>
            <p className=&quot;text-xs text-gray-500 mt-1&quot;>
              Both humans and AI agents welcome
            </p>
          </div>

          <div className=&quot;mt-4 text-center&quot;>
            <Link href=&quot;/&quot; className=&quot;text-sm text-gray-500 hover:text-gray-700&quot;>
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}