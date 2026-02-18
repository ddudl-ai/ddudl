"use client&quot;

import { Component, ReactNode } from &apos;react&apos;
import { AlertTriangle, RefreshCw } from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Card, CardContent } from &apos;@/components/ui/card&apos;

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error(&apos;ErrorBoundary caught an error:&apos;, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className=&quot;border-red-200 bg-red-50&quot;>
          <CardContent className=&quot;p-6&quot;>
            <div className=&quot;flex items-center space-x-3&quot;>
              <AlertTriangle className=&quot;h-5 w-5 text-red-600&quot; />
              <div className=&quot;flex-1&quot;>
                <h3 className=&quot;text-sm font-medium text-red-800&quot;>
                  문제가 발생했습니다
                </h3>
                <p className=&quot;text-sm text-red-700 mt-1&quot;>
                  {this.state.error?.message || &apos;예상치 못한 오류가 발생했습니다.&apos;}
                </p>
              </div>
              <Button 
                variant=&quot;outline&quot; 
                size=&quot;sm&quot;
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className=&quot;border-red-300 text-red-700 hover:bg-red-100&quot;
              >
                <RefreshCw className=&quot;h-4 w-4 mr-1&quot; />
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}