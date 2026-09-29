import {
  type DataSnapshot,
  type Unsubscribe,
  onValue,
  push,
  ref,
  remove,
  update,
} from "firebase/database";

import { type AuthUser } from "./authService";
import { getDb, getFirebaseAuth } from "./firebase";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

// The account that created a task.
export interface TaskCreator {
  uid: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  deadline: string;
  // Missing on tasks created before sign-in was added to the app.
  createdBy?: TaskCreator;
}

// A task as stored in the database: the id is the key of /tasks/{id}, not a field.
export type TaskData = Omit<Task, "id">;

// The fields a user fills in. createdBy is not one of them: createTask adds it, and it never changes afterwards.
export type TaskInput = Omit<TaskData, "createdBy">;

// Must stay equal to the limits in database.rules.json, which rejects longer text.
export const maxTitleLength: number = 200;
export const maxDescriptionLength: number = 2000;

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
 * @description Saves a new task under /tasks with an auto-generated key, with the signed-in user attached as createdBy. Resolves once Firebase has confirmed the write, and rejects if nobody is signed in or the write was refused (e.g. by the database rules).
 */
export async function createTask(task: TaskInput): Promise<void> {
  const user: AuthUser | null = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("belum masuk ke akun");
  }
  const data: TaskData = {
    ...task,
    createdBy: { uid: user.uid, email: user.email ?? "" },
  };
  await push(ref(getDb(), "tasks"), data);
}

/**
 * @description Changes only the given fields of /tasks/{id} (e.g. { status: "done" }); other fields, including createdBy, are left as they are. Rejects if the write is refused.
 */
export async function updateTask(
  id: string,
  changes: Partial<TaskInput>,
): Promise<void> {
  await update(ref(getDb(), `tasks/${id}`), changes);
}

/**
 * @description Permanently removes /tasks/{id}. Rejects if the delete is refused.
 */
export async function deleteTask(id: string): Promise<void> {
  await remove(ref(getDb(), `tasks/${id}`));
}

interface TaskService {
  subscribeTasks: typeof subscribeTasks;
  createTask: typeof createTask;
  updateTask: typeof updateTask;
  deleteTask: typeof deleteTask;
}

const taskService: TaskService = {
  subscribeTasks,
  createTask,
  updateTask,
  deleteTask,
};

export default taskService;
