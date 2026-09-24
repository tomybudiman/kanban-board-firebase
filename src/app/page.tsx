"use client";

import { faPlus } from "@fortawesome/pro-solid-svg-icons";
import { useState } from "react";

import Button from "@/components/Button/Button";
import Modal from "@/components/Modal/Modal";
import taskService, { TaskStatus } from "@/services/tasksService";

import styles from "./page.module.scss";

export default function Home() {
  const [isModalOpen, setModalState] = useState<boolean>(false);
  const [content, setContent] = useState<
    { id: TaskStatus; label: string; tasks: [] }[]
  >([
    { id: "todo", label: "To Do", tasks: [] },
    { id: "in_progress", label: "In Progress", tasks: [] },
    { id: "done", label: "Done", tasks: [] },
  ]);

  // Main Render
  return (
    <>
      <Modal isOpen={isModalOpen} onClose={() => setModalState(false)} />
      <div className={styles.Home}>
        <header className={styles.Home__header}>
          <div className={styles.Home__header__textContainer}>
            <h1>Kanban Board</h1>
            <h4>Firebase Realtime Database</h4>
          </div>
          <Button startIcon={faPlus}>Tambah Task</Button>
        </header>
        <div className={styles.Home__content}>
          {content.map((eachStatus) => (
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
