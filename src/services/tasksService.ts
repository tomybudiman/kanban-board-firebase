import {
  type DataSnapshot,
  type Unsubscribe,
  onValue,
  push,
  ref,
  update,
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

/**
 * @description Saves a new task under /tasks with an auto-generated key. Resolves once Firebase has confirmed the write, and rejects if it was refused (e.g. by the database rules).
 */
export async function createTask(task: TaskData): Promise<void> {
  await push(ref(getDb(), "tasks"), task);
}

/**
 * @description Changes only the given fields of /tasks/{id} (e.g. { status: "done" }); other fields are left as they are. Rejects if the write is refused.
 */
export async function updateTask(
  id: string,
  changes: Partial<TaskData>,
): Promise<void> {
  await update(ref(getDb(), `tasks/${id}`), changes);
}

interface TaskService {
  subscribeTasks: typeof subscribeTasks;
  createTask: typeof createTask;
  updateTask: typeof updateTask;
}

const taskService: TaskService = { subscribeTasks, createTask, updateTask };

export default taskService;
