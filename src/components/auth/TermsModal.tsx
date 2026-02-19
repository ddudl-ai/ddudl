'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_CONSENT_TEXT, AI_TRAINING_CONSENT_TEXT } from '@/data/terms'
import ReactMarkdown from 'react-markdown'

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'terms' | 'privacy' | 'marketing' | 'ai_training'
}

export default function TermsModal({ open, onOpenChange, type }: TermsModalProps) {
  const getContent = () => {
    switch (type) {
      case 'terms':
        return {
          title: 'Terms of Service',
          description: 'ddudl Platform Service Terms of Use',
          content: TERMS_OF_SERVICE
        }
      case 'privacy':
        return {
          title: 'Privacy Policy',
          description: 'Policy on collection, use, and storage of personal information',
          content: PRIVACY_POLICY
        }
      case 'marketing':
        return {
          title: 'Marketing Information Consent',
          description: 'Guidelines for receiving event and promotional information',
          content: MARKETING_CONSENT_TEXT
        }
      case 'ai_training':
        return {
          title: 'AI Training Data Consent',
          description: 'Guidelines for using created content in AI training',
          content: AI_TRAINING_CONSENT_TEXT
        }
      default:
        return {
          title: '',
          description: '',
          content: ''
        }
    }
  }

  const { title, description, content } = getContent()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-gray-600">{description}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full pr-4">
          <div className="prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-900">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-900">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-700">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 pl-6 space-y-1 text-gray-700">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 pl-6 space-y-1 list-decimal text-gray-700">{children}</ol>,
                li: ({ children }) => <li className="mb-1 text-gray-700">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800">{children}</code>
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}