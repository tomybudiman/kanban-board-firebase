"use client";

import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDays,
  faChevronDown,
  faTimes,
} from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import {
  type SubmitHandler,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";

import Button from "@/components/Button/Button";
import Modal, {
  type ModalContextValue,
  type ModalProps,
  useModal,
} from "@/components/Modal/Modal";
import {
  type TaskData,
  type TaskPriority,
  type TaskStatus,
} from "@/services/tasksService";

import styles from "./ModalForm.module.scss";

export type TaskFormValues = TaskData;

interface ModalFormProps {
  title: string;
  isOpen: ModalProps["isOpen"];
  onClose: ModalProps["onClose"];
  defaultValues?: Partial<TaskFormValues>;
  onSubmit: (values: TaskFormValues) => void | Promise<void>;
}

interface TaskFormProps {
  defaultValues: ModalFormProps["defaultValues"];
  onSubmit: ModalFormProps["onSubmit"];
}

interface FieldErrorProps {
  id: string;
  message?: string;
}

interface FieldControlProps {
  icon: IconDefinition;
  children: ReactNode;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

const statusOptions: Option<TaskStatus>[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorityOptions: Option<TaskPriority>[] = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
];

/**
 * @description Returns today's date as YYYY-MM-DD in the user's local timezone, the format used by <input type="date">.
 */
function getToday(): string {
  const now: Date = new Date();
  const localTime: number = now.getTime() - now.getTimezoneOffset() * 60_000;
  return new Date(localTime).toISOString().slice(0, 10);
}

/**
 * @description Opens the browser's date picker when anywhere on a date field is clicked, not only its calendar icon.
 */
function openDatePicker(event: MouseEvent<HTMLInputElement>): void {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Browsers without showPicker() support: the field still works by typing or through its calendar icon.
  }
}

/**
 * @description Shows a field's validation message, or nothing when the field is valid.
 */
function FieldError({ id, message }: FieldErrorProps): ReactElement | null {
  if (!message) return null;
  return (
    <p id={id} className={styles.ModalForm__content__field__error}>
      {message}
    </p>
  );
}

/**
 * @description Wraps a select or date input and shows a Font Awesome icon on its right, replacing the browser's own arrow/calendar icon.
 */
function FieldControl({ icon, children }: FieldControlProps): ReactElement {
  return (
    <div className={styles.ModalForm__content__field__control}>
      {children}
      <FontAwesomeIcon
        icon={icon}
        className={styles.ModalForm__content__field__icon}
      />
    </div>
  );
}

/**
 * @description The task form. It is rendered inside <Modal>, so it mounts fresh every time the modal opens and never keeps values from a previous open.
 */
function TaskForm({ defaultValues, onSubmit }: TaskFormProps): ReactElement {
  const { close }: ModalContextValue = useModal();
  const id: string = useId();
  const {
    control,
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  }: UseFormReturn<TaskFormValues> = useForm<TaskFormValues>({
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      startDate: getToday(),
      deadline: "",
      ...defaultValues,
    },
  });
  const startDate: string = useWatch({ control, name: "startDate" });

  /**
   * @description Trims the text fields, then hands the values to the parent. Only the six task fields are passed on, so extra keys in defaultValues (such as the id of the task being edited) never end up in Firebase. If the parent fails (e.g. Firebase refuses the write), the error is shown in the form and the modal stays open.
   */
  const submit: SubmitHandler<TaskFormValues> = async (
    values: TaskFormValues,
  ): Promise<void> => {
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        startDate: values.startDate,
        deadline: values.deadline,
      });
    } catch (error: unknown) {
      const reason: string =
        error instanceof Error ? error.message : "terjadi kesalahan";
      setError("root", { message: `Gagal menyimpan task: ${reason}` });
    }
  };

  // Main render
  return (
    <form
      noValidate
      className={styles.ModalForm__content}
      onSubmit={handleSubmit(submit)}
    >
      <div className={styles.ModalForm__content__field}>
        <label htmlFor={`${id}-title`}>Judul</label>
        <input
          id={`${id}-title`}
          type="text"
          data-autofocus
          placeholder="Contoh: Desain halaman login"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={`${id}-title-error`}
          {...register("title", {
            validate: (value: string): true | string =>
              value.trim() !== "" || "Judul task wajib diisi",
          })}
        />
        <FieldError id={`${id}-title-error`} message={errors.title?.message} />
      </div>
      <div className={styles.ModalForm__content__field}>
        <label htmlFor={`${id}-description`}>Deskripsi</label>
        <textarea
          id={`${id}-description`}
          rows={3}
          placeholder="Deskripsi singkat task (opsional)"
          {...register("description")}
        />
      </div>
      <div className={styles.ModalForm__content__field}>
        <label htmlFor={`${id}-status`}>Status</label>
        <FieldControl icon={faChevronDown}>
          <select id={`${id}-status`} {...register("status")}>
            {statusOptions.map((option: Option<TaskStatus>): ReactElement => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldControl>
      </div>
      <div className={styles.ModalForm__content__field}>
        <label htmlFor={`${id}-priority`}>Prioritas</label>
        <FieldControl icon={faChevronDown}>
          <select id={`${id}-priority`} {...register("priority")}>
            {priorityOptions.map(
              (option: Option<TaskPriority>): ReactElement => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ),
            )}
          </select>
        </FieldControl>
      </div>
      <div className={styles.ModalForm__content__row}>
        <div className={styles.ModalForm__content__field}>
          <label htmlFor={`${id}-startDate`}>Tanggal Mulai</label>
          <FieldControl icon={faCalendarDays}>
            <input
              id={`${id}-startDate`}
              type="date"
              onClick={openDatePicker}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={`${id}-startDate-error`}
              {...register("startDate", {
                required: "Tanggal mulai wajib diisi",
                deps: "deadline",
              })}
            />
          </FieldControl>
          <FieldError
            id={`${id}-startDate-error`}
            message={errors.startDate?.message}
          />
        </div>
        <div className={styles.ModalForm__content__field}>
          <label htmlFor={`${id}-deadline`}>Deadline</label>
          <FieldControl icon={faCalendarDays}>
            <input
              id={`${id}-deadline`}
              type="date"
              onClick={openDatePicker}
              min={startDate || undefined}
              aria-invalid={Boolean(errors.deadline)}
              aria-describedby={`${id}-deadline-error`}
              {...register("deadline", {
                required: "Deadline wajib diisi",
                validate: (
                  value: string,
                  values: TaskFormValues,
                ): true | string =>
                  !values.startDate ||
                  value >= values.startDate ||
                  "Deadline tidak boleh sebelum tanggal mulai",
              })}
            />
          </FieldControl>
          <FieldError
            id={`${id}-deadline-error`}
            message={errors.deadline?.message}
          />
        </div>
      </div>
      {errors.root?.message && (
        <p role="alert" className={styles.ModalForm__content__error}>
          {errors.root.message}
        </p>
      )}
      <div className={styles.ModalForm__footer}>
        <Button
          size="medium"
          color="neutral"
          variant="outlined"
          disabled={isSubmitting}
          onClick={(): void => close()}
        >
          Batal
        </Button>
        <Button size="medium" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Task"}
        </Button>
      </div>
    </form>
  );
}

export default function ModalForm({
  title,
  isOpen,
  onClose,
  defaultValues,
  onSubmit,
}: ModalFormProps): ReactElement {
  const titleId: string = useId();

  // Main render
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className={styles.ModalForm}
      aria-labelledby={titleId}
    >
      <div className={styles.ModalForm__header}>
        <p id={titleId}>{title}</p>
        <button
          type="button"
          aria-label="Tutup"
          onClick={(): void => onClose()}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <TaskForm defaultValues={defaultValues} onSubmit={onSubmit} />
    </Modal>
  );
}
