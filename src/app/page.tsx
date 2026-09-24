"use client";

import { faPlus } from "@fortawesome/pro-solid-svg-icons";
import { type ReactElement, useState } from "react";

import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import ModalForm from "@/components/ModalForm/ModalForm";
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
  const [content, setContent] = useState<StatusColumn[]>([
    { id: "todo", label: "To Do", tasks: [] },
    { id: "in_progress", label: "In Progress", tasks: [] },
    { id: "done", label: "Done", tasks: [] },
  ]);

  /**
   * @description Sets the modal type to "create" and opens the modal.
   */
  const onClickCreateTask: () => void = (): void => {
    setModalType("create");
    setModalState(true);
  };

  /**
   * @description Closes the modal once the form is submitted. Saving the task to Firebase is not wired up yet.
   */
  const onSubmitTask: () => void = (): void => {
    setModalState(false);
  };

  // Main Render
  return (
    <>
      <ModalForm
        isOpen={isModalOpen}
        onClose={(): void => setModalState(false)}
        title={modalType === "create" ? "Tambah Task Baru" : "Edit Task"}
        onSubmit={onSubmitTask}
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
                {eachStatus.tasks.length === 0 ? (
                  <div
                    className={
                      styles.Home__content__statusRow__emptyTaskPlaceholder
                    }
                  >
                    <p>Belum ada task</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
