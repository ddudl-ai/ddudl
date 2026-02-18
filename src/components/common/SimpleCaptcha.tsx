'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw } from 'lucide-react'

interface SimpleCaptchaProps {
  onVerify: (isValid: boolean) => void
  className?: string
}

export default function SimpleCaptcha({ onVerify, className }: SimpleCaptchaProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
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
    setUserAnswer('')
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
      <div className="flex items-center space-x-2">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-3 rounded-lg font-mono text-lg font-bold">
          {question}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateQuestion}
          className="p-2"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter your answer"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className={`w-24 ${isVerified ? 'border-green-500 bg-green-50' : ''}`}
        />
        {isVerified && (
          <span className="text-green-600 text-sm">✓ Verified</span>
        )}
      </div>
    </div>
  )
}