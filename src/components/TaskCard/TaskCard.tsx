"use client";

import { faChevronDown } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type ChangeEvent, type ReactElement } from "react";

import Button from "@/components/Button/Button";
import {
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/services/tasksService";

import styles from "./TaskCard.module.scss";

export interface TaskCardProps {
  priority: Task["priority"];
  title: Task["title"];
  description: Task["description"];
  startDate: Task["startDate"];
  deadline: Task["deadline"];
  status: Task["status"];
  onStatusChange: (status: TaskStatus) => void;
}

interface StatusOption {
  value: TaskStatus;
  label: string;
}

const priorityLabels: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
};

const statusOptions: StatusOption[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

// "UTC" because new Date("2026-09-20") is midnight UTC; formatting it in another timezone could show the previous day.
const dateFormatOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
};
const dateFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
  "id-ID",
  dateFormatOptions,
);
const dateWithYearFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat(
  "id-ID",
  { ...dateFormatOptions, year: "numeric" },
);

/**
 * @description Parses a YYYY-MM-DD date, or returns null when the value is not a valid date.
 */
function parseDate(value: string): Date | null {
  const date: Date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @description Formats a YYYY-MM-DD date as "20 September", or "20 September 2026" when withYear is true. Returns the raw value (or "-") instead of crashing when the date is invalid.
 */
function formatDate(value: string, withYear: boolean): string {
  const date: Date | null = parseDate(value);
  if (!date) return value || "-";
  return (withYear ? dateWithYearFormatter : dateFormatter).format(date);
}

export default function TaskCard({
  priority,
  title,
  description,
  startDate,
  deadline,
  status,
  onStatusChange,
}: TaskCardProps): ReactElement {
  const priorityClassName: string = [
    styles.TaskCard__priority,
    styles[`TaskCard__priority--${priority}`],
  ].join(" ");
  const titleClassName: string = [
    styles.TaskCard__taskTitle,
    status === "done" && styles["TaskCard__taskTitle--done"],
  ]
    .filter(Boolean)
    .join(" ");
  // The year is only shown when the task spans two different years.
  const showYear: boolean =
    parseDate(startDate)?.getUTCFullYear() !==
    parseDate(deadline)?.getUTCFullYear();

  // Main render
  return (
    <div className={styles.TaskCard}>
      <span className={priorityClassName}>{priorityLabels[priority]}</span>
      <p className={titleClassName}>{title}</p>
      <p className={styles.TaskCard__taskDescription}>{description}</p>
      <p className={styles.TaskCard__taskDate}>
        <time dateTime={startDate}>{formatDate(startDate, showYear)}</time>
        {" – "}
        <time dateTime={deadline}>{formatDate(deadline, showYear)}</time>
      </p>
      <span className={styles.TaskCard__horizontalLine} />
      <div className={styles.TaskCard__actionRow}>
        <div className={styles.TaskCard__actionRow__status}>
          <select
            value={status}
            aria-label="Ubah status task"
            onChange={(event: ChangeEvent<HTMLSelectElement>): void =>
              onStatusChange(event.target.value as TaskStatus)
            }
          >
            {statusOptions.map((option: StatusOption): ReactElement => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FontAwesomeIcon icon={faChevronDown} />
        </div>
        <Button size="small" variant="text">
          Edit
        </Button>
        <Button size="small" color="danger" variant="text">
          Hapus
        </Button>
      </div>
    </div>
  );
}
