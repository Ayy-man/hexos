'use client';

/**
 * Kanban Board Demo
 *
 * Example showing how to use the Kanban component for multi-column drag-and-drop.
 * Use cases:
 * - Project pipeline (Backlog -> In Progress -> Done)
 * - Deal stages (Lead -> Proposal -> Negotiation -> Won)
 * - Content workflow (Draft -> Review -> Published)
 */

import { useState } from 'react';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanMoveEvent,
} from '@/components/ui/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high';
}

type Status = 'backlog' | 'in_progress' | 'review' | 'done';

const STATUSES: Status[] = ['backlog', 'in_progress', 'review', 'done'];

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'border-t-gray-500' },
  in_progress: { label: 'In Progress', color: 'border-t-blue-500' },
  review: { label: 'Review', color: 'border-t-yellow-500' },
  done: { label: 'Done', color: 'border-t-green-500' },
};

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const initialTasks: Record<Status, Task[]> = {
  backlog: [
    { id: '1', title: 'Design new landing page', assignee: 'Alice', priority: 'medium' },
    { id: '2', title: 'Set up CI/CD pipeline', assignee: 'Bob', priority: 'high' },
  ],
  in_progress: [
    { id: '3', title: 'Implement auth flow', assignee: 'Charlie', priority: 'high' },
    { id: '4', title: 'Write API documentation', assignee: 'Diana', priority: 'low' },
  ],
  review: [
    { id: '5', title: 'Code review: payment module', assignee: 'Eve', priority: 'medium' },
  ],
  done: [
    { id: '6', title: 'Setup project repository', assignee: 'Frank', priority: 'low' },
  ],
};

export default function KanbanDemo() {
  const [tasks, setTasks] = useState<Record<Status, Task[]>>(initialTasks);

  const handleMove = (event: KanbanMoveEvent) => {
    const { activeContainer, overContainer } = event;
    const fromStatus = activeContainer as Status;
    const toStatus = overContainer as Status;

    if (fromStatus === toStatus) return;

    // Find the moved task
    const taskId = event.event.active.id as string;
    const task = tasks[fromStatus].find((t) => t.id === taskId);

    if (!task) return;

    toast.success(`Moved "${task.title}"`, {
      description: `${STATUS_CONFIG[fromStatus].label} → ${STATUS_CONFIG[toStatus].label}`,
    });
  };

  const handleValueChange = (newTasks: Record<string, Task[]>) => {
    setTasks(newTasks as Record<Status, Task[]>);
  };

  const findTaskById = (id: string): Task | undefined => {
    for (const status of STATUSES) {
      const found = tasks[status].find((t) => t.id === id);
      if (found) return found;
    }
    return undefined;
  };

  return (
    <div className="w-full p-6">
      <h2 className="text-lg font-semibold mb-4">Project Board</h2>

      <Kanban
        value={tasks}
        onValueChange={handleValueChange}
        getItemValue={(task) => task.id}
        onMove={handleMove}
      >
        <KanbanBoard className="grid grid-cols-4 gap-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              value={status}
              disabled
              className={cn(
                'rounded-lg bg-muted/30 border-t-4',
                STATUS_CONFIG[status].color
              )}
            >
              {/* Column Header */}
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{STATUS_CONFIG[status].label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tasks[status].length}
                  </Badge>
                </div>
              </div>

              {/* Column Content */}
              <KanbanColumnContent value={status} className="p-2 min-h-[300px]">
                {tasks[status].map((task) => (
                  <KanbanItem key={task.id} value={task.id}>
                    <TaskCard task={task} />
                  </KanbanItem>
                ))}

                {tasks[status].length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Drop tasks here
                  </div>
                )}
              </KanbanColumnContent>
            </KanbanColumn>
          ))}
        </KanbanBoard>

        {/* Drag Overlay */}
        <KanbanOverlay>
          {({ value }) => {
            const task = findTaskById(value as string);
            if (!task) return null;
            return <TaskCard task={task} isDragging />;
          }}
        </KanbanOverlay>
      </Kanban>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

function TaskCard({ task, isDragging }: TaskCardProps) {
  return (
    <Card className={cn('select-none', isDragging && 'shadow-lg ring-2 ring-primary')}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <KanbanItemHandle className="text-muted-foreground hover:text-foreground mt-0.5">
            <GripVertical className="h-4 w-4" />
          </KanbanItemHandle>
          <span className="text-sm font-medium flex-1">{task.title}</span>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={cn('text-xs', PRIORITY_COLORS[task.priority])}>
            {task.priority}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {task.assignee}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
