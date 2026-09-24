"use client";

import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type ReactElement, type ReactNode, useId, useState } from "react";

import Button from "@/components/Button/Button";
import Modal, {
  type ModalContextValue,
  type ModalProps,
  useModal,
} from "@/components/Modal/Modal";

import styles from "./ConfirmDialog.module.scss";

export type ConfirmDialogVariant = "default" | "danger";

export interface ConfirmDialogProps {
  isOpen: ModalProps["isOpen"];
  onClose: ModalProps["onClose"];
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  icon?: IconDefinition;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmDialogContentProps {
  titleId: string;
  descriptionId: string;
  onConfirm: ConfirmDialogProps["onConfirm"];
  title: string;
  description: ConfirmDialogProps["description"];
  icon: ConfirmDialogProps["icon"];
  variant: ConfirmDialogVariant;
  confirmLabel: string;
  cancelLabel: string;
}

/**
 * @description The dialog's content. It is rendered inside <Modal>, so its pending and error state start fresh every time the dialog opens.
 */
function ConfirmDialogContent({
  titleId,
  descriptionId,
  onConfirm,
  title,
  description,
  icon,
  variant,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogContentProps): ReactElement {
  const { close }: ModalContextValue = useModal();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * @description Runs onConfirm and closes the dialog once it succeeds. If it fails, the error is shown and the dialog stays open so the user can retry or cancel.
   */
  const onClickConfirm: () => Promise<void> = async (): Promise<void> => {
    setIsPending(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (confirmError: unknown) {
      const reason: string =
        confirmError instanceof Error
          ? confirmError.message
          : "terjadi kesalahan";
      setError(`Gagal: ${reason}`);
      setIsPending(false);
    }
  };

  // Main render
  return (
    <div className={styles.ConfirmDialog__content}>
      {icon && (
        <span
          className={[
            styles.ConfirmDialog__icon,
            styles[`ConfirmDialog__icon--${variant}`],
          ].join(" ")}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      <div className={styles.ConfirmDialog__textContainer}>
        <p id={titleId} className={styles.ConfirmDialog__title}>
          {title}
        </p>
        {description && (
          <div id={descriptionId} className={styles.ConfirmDialog__description}>
            {description}
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.ConfirmDialog__error}>
          {error}
        </p>
      )}
      <div className={styles.ConfirmDialog__actions}>
        <Button
          data-autofocus
          size="medium"
          color="neutral"
          variant="outlined"
          disabled={isPending}
          onClick={(): void => close()}
        >
          {cancelLabel}
        </Button>
        <Button
          size="medium"
          color={variant === "danger" ? "danger" : "primary"}
          disabled={isPending}
          onClick={(): void => {
            void onClickConfirm();
          }}
        >
          {isPending ? "Memproses..." : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  variant = "default",
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
}: ConfirmDialogProps): ReactElement {
  const titleId: string = useId();
  const descriptionId: string = useId();

  // Main render
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      className={styles.ConfirmDialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <ConfirmDialogContent
        titleId={titleId}
        descriptionId={descriptionId}
        onConfirm={onConfirm}
        title={title}
        description={description}
        icon={icon}
        variant={variant}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
      />
    </Modal>
  );
}
