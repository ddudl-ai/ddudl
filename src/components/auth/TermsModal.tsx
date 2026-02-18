'use client&apos;

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from &apos;@/components/ui/dialog&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { ScrollArea } from &apos;@/components/ui/scroll-area&apos;
import { TERMS_OF_SERVICE, PRIVACY_POLICY, MARKETING_CONSENT_TEXT, AI_TRAINING_CONSENT_TEXT } from &apos;@/data/terms&apos;
import ReactMarkdown from &apos;react-markdown&apos;

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: &apos;terms&apos; | &apos;privacy&apos; | &apos;marketing&apos; | &apos;ai_training&apos;
}

export default function TermsModal({ open, onOpenChange, type }: TermsModalProps) {
  const getContent = () => {
    switch (type) {
      case &apos;terms&apos;:
        return {
          title: &apos;Terms of Service&apos;,
          description: &apos;ddudl Platform Service Terms of Use&apos;,
          content: TERMS_OF_SERVICE
        }
      case &apos;privacy&apos;:
        return {
          title: &apos;Privacy Policy&apos;,
          description: &apos;Policy on collection, use, and storage of personal information&apos;,
          content: PRIVACY_POLICY
        }
      case &apos;marketing&apos;:
        return {
          title: &apos;Marketing Information Consent&apos;,
          description: &apos;Guidelines for receiving event and promotional information&apos;,
          content: MARKETING_CONSENT_TEXT
        }
      case &apos;ai_training&apos;:
        return {
          title: &apos;AI Training Data Consent&apos;,
          description: &apos;Guidelines for using created content in AI training&apos;,
          content: AI_TRAINING_CONSENT_TEXT
        }
      default:
        return {
          title: &apos;',
          description: &apos;',
          content: &apos;'
        }
    }
  }

  const { title, description, content } = getContent()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=&quot;max-w-4xl max-h-[80vh] bg-white&quot;>
        <DialogHeader>
          <DialogTitle className=&quot;text-gray-900&quot;>{title}</DialogTitle>
          <DialogDescription className=&quot;text-gray-600&quot;>{description}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className=&quot;h-[60vh] w-full pr-4&quot;>
          <div className=&quot;prose prose-sm max-w-none text-gray-800&quot;>
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className=&quot;text-2xl font-bold mb-4 mt-6 text-gray-900&quot;>{children}</h1>,
                h2: ({ children }) => <h2 className=&quot;text-xl font-semibold mb-3 mt-5 text-gray-900&quot;>{children}</h2>,
                h3: ({ children }) => <h3 className=&quot;text-lg font-medium mb-2 mt-4 text-gray-900&quot;>{children}</h3>,
                p: ({ children }) => <p className=&quot;mb-3 leading-relaxed text-gray-700&quot;>{children}</p>,
                ul: ({ children }) => <ul className=&quot;mb-3 pl-6 space-y-1 text-gray-700&quot;>{children}</ul>,
                ol: ({ children }) => <ol className=&quot;mb-3 pl-6 space-y-1 list-decimal text-gray-700&quot;>{children}</ol>,
                li: ({ children }) => <li className=&quot;mb-1 text-gray-700&quot;>{children}</li>,
                strong: ({ children }) => <strong className=&quot;font-semibold text-gray-900&quot;>{children}</strong>,
                code: ({ children }) => <code className=&quot;bg-gray-100 px-1 py-0.5 rounded text-sm text-gray-800&quot;>{children}</code>
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
        
        <div className=&quot;flex justify-end pt-4&quot;>
          <Button onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}