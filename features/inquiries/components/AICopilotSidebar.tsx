'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Send, Loader2 } from 'lucide-react'
import { FIELD_LISTS, PATH_LABELS } from '../constants/fieldMappings'
import type { FormPath } from '../schemas/intakeFormSchema'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AICopilotSidebarProps {
  currentPath: FormPath | null
  onSetField: (fieldName: string, value: unknown) => void
}

export function AICopilotSidebar({ currentPath, onSetField }: AICopilotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          formPath: currentPath,
          availableFields: currentPath ? FIELD_LISTS[currentPath] : [],
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      // Handle tool calls if present
      if (data.choices?.[0]?.message?.tool_calls) {
        for (const toolCall of data.choices[0].message.tool_calls) {
          if (toolCall.function?.name === 'set_form_field') {
            const args = JSON.parse(toolCall.function.arguments)
            onSetField(args.field_name, args.value)
          }
        }
      }

      const assistantContent = data.choices?.[0]?.message?.content || 'I\'ve updated the form fields based on your input.'
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
    } catch (error) {
      console.error('Copilot error:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className="flex flex-col max-h-[500px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-cyan-500" />
          AI Assistant
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {currentPath
            ? `Helping with: ${PATH_LABELS[currentPath] || currentPath}`
            : 'Ready to help with your intake form'
          }
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Instructions */}
        {messages.length === 0 && (
          <div className="rounded-lg bg-muted/50 p-4 mb-4">
            <p className="text-sm text-muted-foreground">
              Paste your discovery call notes, emails, or chat transcripts and I&apos;ll help fill the form.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[100px] max-h-[280px]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-100 dark:bg-cyan-900/30 ml-4'
                  : 'bg-muted mr-4'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Paste notes or ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
