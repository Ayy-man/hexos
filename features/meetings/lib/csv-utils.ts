/**
 * CSV Utilities for Meeting Tasks
 * Import/export meeting tasks to CSV format using papaparse
 */

import Papa from 'papaparse'
import type {
  MeetingTask,
  MeetingTaskPriority,
  MeetingTaskStatus,
} from '@/lib/types/meetings'
import type { MeetingTaskWithMeetingTitle } from '@/lib/api/meeting-tasks'

// Valid enum values for validation
const VALID_PRIORITIES: MeetingTaskPriority[] = ['low', 'normal', 'high', 'urgent']
const VALID_STATUSES: MeetingTaskStatus[] = [
  'pending',
  'in_progress',
  'done',
  'cancelled',
]

/**
 * CSV row type for export
 */
interface TaskCSVRow {
  title: string
  description: string
  assigned_to: string
  due_date: string
  priority: string
  status: string
  source: string
  meeting_title: string
  created_at: string
}

/**
 * Parsed task from CSV import
 */
export interface ParsedTask {
  title: string
  description?: string
  assigned_to_name?: string
  due_date?: string
  priority: MeetingTaskPriority
  status: MeetingTaskStatus
}

/**
 * Generate CSV string from meeting tasks
 */
export function generateTasksCSV(tasks: MeetingTaskWithMeetingTitle[]): string {
  const csvData: TaskCSVRow[] = tasks.map((task) => ({
    title: task.title || '',
    description: task.description || '',
    assigned_to: task.assigned_to_name || '',
    due_date: task.due_date || '',
    priority: task.priority || 'normal',
    status: task.status || 'pending',
    source: task.source || '',
    meeting_title: task.meeting_title || '',
    created_at: task.created_at || '',
  }))

  return Papa.unparse(csvData)
}

/**
 * Parse CSV text into meeting tasks with validation
 */
export function parseTasksCSV(csvText: string): {
  success: boolean
  tasks?: ParsedTask[]
  error?: string
  errors?: string[]
} {
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().trim(),
  })

  if (parseResult.errors.length > 0) {
    return {
      success: false,
      error: 'CSV parsing failed',
      errors: parseResult.errors.map((e) => e.message),
    }
  }

  const rows = parseResult.data as any[]
  const errors: string[] = []
  const tasks: ParsedTask[] = []

  // Validate title column exists
  if (rows.length > 0 && !rows[0].hasOwnProperty('title')) {
    return {
      success: false,
      error: 'Missing required column: title',
    }
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNum = index + 2 // +2 for 1-indexed + header row
    const rowErrors: string[] = []

    // Validate title (required)
    const title = row.title?.trim()
    if (!title) {
      rowErrors.push(`Row ${rowNum}: Title is required`)
    }

    // Validate priority
    let priority: MeetingTaskPriority = 'normal'
    if (row.priority) {
      const priorityValue = row.priority.toLowerCase().trim() as MeetingTaskPriority
      if (!VALID_PRIORITIES.includes(priorityValue)) {
        rowErrors.push(
          `Row ${rowNum}: Invalid priority "${row.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`
        )
      } else {
        priority = priorityValue
      }
    }

    // Validate status
    let status: MeetingTaskStatus = 'pending'
    if (row.status) {
      const statusValue = row.status.toLowerCase().trim() as MeetingTaskStatus
      if (!VALID_STATUSES.includes(statusValue)) {
        rowErrors.push(
          `Row ${rowNum}: Invalid status "${row.status}". Must be one of: ${VALID_STATUSES.join(', ')}`
        )
      } else {
        status = statusValue
      }
    }

    // Validate due_date if present
    if (row.due_date) {
      const dueDate = row.due_date.trim()
      // Check if it's a valid ISO date string
      const date = new Date(dueDate)
      if (isNaN(date.getTime())) {
        rowErrors.push(
          `Row ${rowNum}: Invalid due_date "${row.due_date}". Must be a valid date string (ISO 8601 format recommended)`
        )
      }
    }

    // If row has errors, add to errors list
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else if (title) {
      // Valid row - add to tasks
      const task: ParsedTask = {
        title,
        priority,
        status,
      }

      if (row.description?.trim()) {
        task.description = row.description.trim()
      }

      if (row.assigned_to?.trim()) {
        task.assigned_to_name = row.assigned_to.trim()
      }

      if (row.due_date?.trim()) {
        task.due_date = row.due_date.trim()
      }

      tasks.push(task)
    }
  })

  if (errors.length > 0) {
    return {
      success: false,
      error: `Validation failed for ${errors.length} row(s)`,
      errors,
    }
  }

  return {
    success: true,
    tasks,
  }
}
