import {
  type DataSnapshot,
  type Unsubscribe,
  onValue,
  ref,
} from "firebase/database";

import { getDb } from "./firebase";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  deadline: string;
}

// A task as stored in the database: the id is the key of /tasks/{id}, not a field.
export type TaskData = Omit<Task, "id">;

export function subscribeTasks(
  onChange: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onValue(
    ref(getDb(), "tasks"),
    (snapshot: DataSnapshot): void => {
      const data: Record<string, TaskData> | null = snapshot.val();
      const tasks: Task[] = Object.entries(data ?? {}).map(
        ([id, task]: [string, TaskData]): Task => ({ id, ...task }),
      );
      onChange(tasks);
    },
    onError,
  );
}
