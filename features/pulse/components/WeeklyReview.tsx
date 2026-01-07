'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

interface WeeklyReviewProps {
  onUpdate: () => void
}

interface ReviewData {
  tasksCompleted: number
  pointsEarned: number
  streakLength: number
  focusText: string
  dismissed: boolean
}

export function WeeklyReview({ onUpdate }: WeeklyReviewProps) {
  const [review, setReview] = useState<ReviewData | null>(null)
  const [focusText, setFocusText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Only show on Monday
  const isMonday = new Date().getDay() === 1

  useEffect(() => {
    if (!isMonday) {
      setIsLoading(false)
      return
    }

    // Simulate loading review data
    // In a real implementation, this would call a server action
    const mockReview: ReviewData = {
      tasksCompleted: 23,
      pointsEarned: 187,
      streakLength: 12,
      focusText: '',
      dismissed: false,
    }

    setReview(mockReview)
    setFocusText(mockReview.focusText)
    setIsLoading(false)
  }, [isMonday])

  // Don't render if not Monday, still loading, or already dismissed
  if (!isMonday || isLoading || review?.dismissed) return null

  const handleSave = async () => {
    setIsSaving(true)
    // In a real implementation, this would call a server action
    // await saveWeeklyReview(focusText)
    setIsSaving(false)
    onUpdate()
  }

  const handleDismiss = async () => {
    // In a real implementation, this would call a server action
    // await dismissWeeklyReview()
    setReview((r) => (r ? { ...r, dismissed: true } : null))
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground">WEEKLY REVIEW</h2>
        <Button variant="ghost" size="icon" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <p className="text-sm">
          Last week you completed <span className="font-medium">{review?.tasksCompleted || 0} tasks</span> and
          earned <span className="font-medium">{review?.pointsEarned || 0} pts</span>.
          {review?.streakLength ? (
            <>
              {' '}Your streak is <span className="font-medium">{review.streakLength} days</span>.
              {review.streakLength >= 7 && ' You\'re on fire. 🔥'}
            </>
          ) : null}
        </p>

        <div>
          <label className="text-sm font-medium mb-2 block">
            What's the #1 focus for this week?
          </label>
          <Textarea
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
            placeholder="Enter your main focus for the week..."
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
