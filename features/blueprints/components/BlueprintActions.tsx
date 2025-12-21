'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Copy, Edit, Eye, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import { duplicateBlueprintAction, deleteBlueprintAction } from '../actions/blueprintActions'

interface BlueprintActionsProps {
  blueprintId: string
  isEditMode: boolean
}

export function BlueprintActions({ blueprintId, isEditMode }: BlueprintActionsProps) {
  const [isPending, startTransition] = useTransition()

  const handleDuplicate = () => {
    startTransition(async () => {
      await duplicateBlueprintAction(blueprintId)
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this blueprint? This action cannot be undone.')) {
      startTransition(async () => {
        await deleteBlueprintAction(blueprintId)
      })
    }
  }

  return (
    <div className="flex gap-2">
      {isEditMode ? (
        <Button variant="outline" asChild>
          <Link href={`/blueprints/${blueprintId}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Mode
          </Link>
        </Button>
      ) : (
        <Button variant="outline" asChild>
          <Link href={`/blueprints/${blueprintId}?edit=true`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDuplicate} disabled={isPending}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
