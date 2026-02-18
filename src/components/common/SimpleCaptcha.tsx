'use client&apos;

import { useState, useEffect } from &apos;react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { RefreshCw } from &apos;lucide-react&apos;

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void
  className?: string
}

export default function SimpleCaptcha({ onVerify, className }: SimpleCaptchaProps) {
  const [question, setQuestion] = useState(&apos;')
  const [answer, setAnswer] = useState(&apos;')
  const [userAnswer, setUserAnswer] = useState(&apos;')
  const [isVerified, setIsVerified] = useState(false)

  const generateQuestion = () => {
    const operations = [
      () => {
        const a = Math.floor(Math.random() * 10) + 1
        const b = Math.floor(Math.random() * 10) + 1
        return { question: `${a} + ${b} = ?`, answer: a + b }
      },
      () => {
        const a = Math.floor(Math.random() * 10) + 5
        const b = Math.floor(Math.random() * 5) + 1
        return { question: `${a} - ${b} = ?`, answer: a - b }
      },
      () => {
        const a = Math.floor(Math.random() * 5) + 2
        const b = Math.floor(Math.random() * 5) + 2
        return { question: `${a} × ${b} = ?`, answer: a * b }
      }
    ]
    
    const operation = operations[Math.floor(Math.random() * operations.length)]
    const result = operation()
    
    setQuestion(result.question)
    setAnswer(result.answer.toString())
    setUserAnswer(&apos;')
    setIsVerified(false)
    onVerify(false)
  }

  useEffect(() => {
    generateQuestion()
  }, [])

  const handleAnswerChange = (value: string) => {
    setUserAnswer(value)
    const isCorrect = value === answer
    setIsVerified(isCorrect)
    onVerify(isCorrect)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className=&quot;flex items-center space-x-2&quot;>
        <div className=&quot;bg-gray-100 border-2 border-dashed border-gray-300 p-3 rounded-lg font-mono text-lg font-bold&quot;>
          {question}
        </div>
        <Button
          type=&quot;button&quot;
          variant=&quot;ghost&quot;
          size=&quot;sm&quot;
          onClick={generateQuestion}
          className=&quot;p-2&quot;
        >
          <RefreshCw className=&quot;w-4 h-4&quot; />
        </Button>
      </div>
      
      <div className=&quot;flex items-center space-x-2&quot;>
        <Input
          type=&quot;text&quot;
          placeholder=&quot;Enter your answer&quot;
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className={`w-24 ${isVerified ? &apos;border-green-500 bg-green-50&apos; : &apos;'}`}
        />
        {isVerified && (
          <span className=&quot;text-green-600 text-sm&quot;>✓ Verified</span>
        )}
      </div>
    </div>
  )
}