'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export function ForwardForm() {
  const { register } = useFormContext()

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Enter the email address(es) you&apos;d like this form to be forwarded to.
          This step is not mandatory.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="forward_email_1">Forward Email 1</Label>
          <Input
            id="forward_email_1"
            type="email"
            placeholder="email@example.com"
            {...register('forward_email_1')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="forward_email_2">Forward Email 2</Label>
          <Input
            id="forward_email_2"
            type="email"
            placeholder="email@example.com"
            {...register('forward_email_2')}
          />
        </div>
      </div>
    </div>
  )
}
