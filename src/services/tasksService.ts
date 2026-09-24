import { onValue, ref } from 'firebase/database';

import { getDb } from './firebase';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  deadline: string;
}

export function subscribeTasks(
  onChange: (tasks: Task[]) => void,
  onError: (error: Error) => void,
) {
  return onValue(
    ref(getDb(), 'tasks'),
    (snapshot) => {
      const data = snapshot.val() as Record<string, Omit<Task, 'id'>> | null;
      onChange(
        Object.entries(data ?? {}).map(([id, task]) => ({ id, ...task })),
      );
    },
    onError,
  );
}
