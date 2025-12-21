'use client';

/**
 * Sortable List Demo
 *
 * Simple example of a sortable list for reordering items.
 * Use cases:
 * - Priority ordering
 * - Menu item ordering
 * - Playlist reordering
 * - Any flat list that needs drag-to-reorder
 */

import { useState } from 'react';
import { Sortable, SortableItem, SortableItemHandle } from '@/components/ui/sortable';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  priority: number;
}

const defaultTasks: Task[] = [
  { id: '1', title: 'Review pull requests', priority: 1 },
  { id: '2', title: 'Update documentation', priority: 2 },
  { id: '3', title: 'Fix navigation bug', priority: 3 },
  { id: '4', title: 'Add unit tests', priority: 4 },
  { id: '5', title: 'Refactor API layer', priority: 5 },
];

export default function SortableListDemo() {
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);

  const handleReorder = (newTasks: Task[]) => {
    // Update priority based on new order
    const updatedTasks = newTasks.map((task, index) => ({
      ...task,
      priority: index + 1,
    }));
    setTasks(updatedTasks);

    toast.success('Tasks reordered', {
      description: `New order: ${updatedTasks.map((t) => t.title).join(', ')}`,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-lg font-semibold mb-4">Priority Tasks</h2>

      <Sortable
        value={tasks}
        onValueChange={handleReorder}
        getItemValue={(task) => task.id}
        strategy="vertical"
        className="space-y-2"
      >
        {tasks.map((task) => (
          <SortableItem key={task.id} value={task.id}>
            <div className="flex items-center gap-3 p-3 bg-card border rounded-lg">
              <SortableItemHandle className="text-muted-foreground hover:text-foreground">
                <GripVertical className="h-4 w-4" />
              </SortableItemHandle>
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                {task.priority}
              </span>
              <span className="flex-1 text-sm">{task.title}</span>
            </div>
          </SortableItem>
        ))}
      </Sortable>
    </div>
  );
}
