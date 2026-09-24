"use client";

import { useState } from "react";

import taskService, { TaskStatus } from "@/services/tasksService";

import styles from "./page.module.scss";

export default function Home() {
  const [content, setContent] = useState<
    { id: TaskStatus; label: string; tasks: [] }[]
  >([
    { id: "todo", label: "To Do", tasks: [] },
    { id: "in_progress", label: "In Progress", tasks: [] },
    { id: "done", label: "Done", tasks: [] },
  ]);

  // Main Render
  return (
    <div className={styles.Home}>
      <header className={styles.Home__header}>
        <h1>Kanban Board</h1>
        <h4 className={styles.Home__header__subtitle}>
          Firebase Realtime Database
        </h4>
      </header>
      <div className={styles.Home__content}>
        {content.map((eachStatus) => (
          <div key={eachStatus.id} className={styles.Home__content__statusRow}>
            <div>
              <p className={styles.Home__content__statusRow__title}>
                {eachStatus.label}
              </p>
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
  );
}
