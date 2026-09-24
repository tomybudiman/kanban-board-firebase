"use client";

import { faPlus, faTrashCan } from "@fortawesome/pro-solid-svg-icons";
import { type ReactElement, useEffect, useState } from "react";

import Button from "@/components/Button/Button";
import ConfirmDialog from "@/components/ConfirmDialog/ConfirmDialog";
import ModalForm, {
  type TaskFormValues,
} from "@/components/ModalForm/ModalForm";
import TaskCard from "@/components/TaskCard/TaskCard";
import taskService, {
  type Task,
  type TaskStatus,
} from "@/services/tasksService";

import styles from "./page.module.scss";

interface StatusColumn {
  id: TaskStatus;
  label: string;
  tasks: Task[];
}

export default function Home(): ReactElement {
  const [modalType, setModalType] = useState<"create" | "edit">("create");
  const [isModalOpen, setModalState] = useState<boolean>(false);
  const [isConfirmationDialogOpen, setConfirmationDialogState] =
    useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Like editingTask, kept after the dialog closes so its text doesn't change during the closing animation.
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [content, setContent] = useState<StatusColumn[]>([
    { id: "todo", label: "To Do", tasks: [] },
    { id: "in_progress", label: "In Progress", tasks: [] },
    { id: "done", label: "Done", tasks: [] },
  ]);

  /**
   * @description Listens to /tasks in Firebase and puts every task into the column matching its status. Runs again on every change in the database; the listener is removed when the page unmounts.
   */
  useEffect((): (() => void) => {
    return taskService.subscribeTasks(
      (tasks: Task[]): void => {
        setContent((columns: StatusColumn[]): StatusColumn[] =>
          columns.map((column: StatusColumn): StatusColumn => ({
            ...column,
            tasks: tasks.filter(
              (task: Task): boolean => task.status === column.id,
            ),
          })),
        );
      },
      (error: Error): void => {
        console.error("Gagal memuat task dari Firebase:", error);
      },
    );
  }, []);

  /**
   * @description Sets the modal type to "create" and opens the modal.
   */
  const onClickCreateTask: () => void = (): void => {
    setModalType("create");
    setEditingTask(null);
    setModalState(true);
  };

  /**
   * @description Sets the modal type to "edit" and opens the modal with the form filled in from the given task.
   */
  const onClickEditTask: (task: Task) => void = (task: Task): void => {
    setModalType("edit");
    setEditingTask(task);
    setModalState(true);
  };

  /**
   * @description Saves the form to Firebase (a new task in create mode, the edited task in edit mode), then closes the modal. If saving fails, the error reaches ModalForm, which shows it and keeps the modal open.
   */
  const onSubmitTask: (values: TaskFormValues) => Promise<void> = async (
    values: TaskFormValues,
  ): Promise<void> => {
    if (modalType === "edit" && editingTask) {
      await taskService.updateTask(editingTask.id, values);
    } else {
      await taskService.createTask(values);
    }
    setModalState(false);
  };

  /**
   * @description Opens the confirmation dialog for deleting the given task.
   */
  const onClickDeleteTask: (task: Task) => void = (task: Task): void => {
    setDeletingTask(task);
    setConfirmationDialogState(true);
  };

  /**
   * @description Deletes the task chosen in onClickDeleteTask from Firebase. ConfirmDialog closes itself when this succeeds, and shows the error when it fails.
   */
  const onConfirmDeleteTask: () => Promise<void> = async (): Promise<void> => {
    if (deletingTask) {
      await taskService.deleteTask(deletingTask.id);
    }
  };

  /**
   * @description Saves a task's new status to Firebase. The card moves to its new column right away, because Firebase updates local listeners before the server confirms; if the server refuses the write, Firebase moves it back and the error is logged.
   */
  const onChangeTaskStatus: (
    id: string,
    status: TaskStatus,
  ) => Promise<void> = async (
    id: string,
    status: TaskStatus,
  ): Promise<void> => {
    try {
      await taskService.updateTask(id, { status });
    } catch (error: unknown) {
      console.error("Gagal mengubah status task:", error);
    }
  };

  // Main Render
  return (
    <>
      <ModalForm
        isOpen={isModalOpen}
        onSubmit={onSubmitTask}
        defaultValues={editingTask ?? undefined}
        onClose={(): void => setModalState(false)}
        title={modalType === "create" ? "Tambah Task Baru" : "Edit Task"}
      />
      <ConfirmDialog
        variant="danger"
        icon={faTrashCan}
        title="Hapus Task Ini?"
        onConfirm={onConfirmDeleteTask}
        isOpen={isConfirmationDialogOpen}
        onClose={(): void => setConfirmationDialogState(false)}
        description={
          <>
            Task <strong>&#34;{deletingTask?.title}&#34;</strong> akan dihapus
            permanen dan tidak bisa dikembalikan.
          </>
        }
        confirmLabel="Hapus Task"
      />
      <div className={styles.Home}>
        <header className={styles.Home__header}>
          <div className={styles.Home__header__textContainer}>
            <h1>Kanban Board</h1>
            <h4>Firebase Realtime Database</h4>
          </div>
          <Button size="medium" startIcon={faPlus} onClick={onClickCreateTask}>
            Tambah Task
          </Button>
        </header>
        <div className={styles.Home__content}>
          {content.map((eachStatus: StatusColumn): ReactElement => (
            <div
              key={eachStatus.id}
              className={styles.Home__content__statusRow}
            >
              <div>
                <div
                  className={styles.Home__content__statusRow__titleContainer}
                >
                  <p>{eachStatus.label}</p>
                  <span>{eachStatus.tasks.length}</span>
                </div>
                <div
                  className={styles.Home__content__statusRow__taskCardContainer}
                >
                  {eachStatus.tasks.length === 0 ? (
                    <div
                      className={
                        styles.Home__content__statusRow__emptyTaskPlaceholder
                      }
                    >
                      <p>Belum ada task</p>
                    </div>
                  ) : (
                    eachStatus.tasks.map((eachTask: Task) => (
                      <TaskCard
                        key={eachTask.id}
                        title={eachTask.title}
                        priority={eachTask.priority}
                        description={eachTask.description}
                        startDate={eachTask.startDate}
                        deadline={eachTask.deadline}
                        status={eachTask.status}
                        onStatusChange={(status: TaskStatus): void => {
                          void onChangeTaskStatus(eachTask.id, status);
                        }}
                        onEdit={(): void => onClickEditTask(eachTask)}
                        onDelete={(): void => onClickDeleteTask(eachTask)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
