"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
} from "react";

import styles from "./Modal.module.scss";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children?: ReactNode;
}

const ModalContext = createContext<{ close: () => void } | null>(null);

// Lets any component rendered inside <Modal> ask the modal to close.
export function useModal() {
  const modal = useContext(ModalContext);
  if (!modal) {
    throw new Error("useModal() must be used inside <Modal>");
  }
  return modal;
}

export default function Modal({
  isOpen,
  onClose,
  className,
  children,
  ...ariaProps
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Keep the native dialog in sync with isOpen. This runs after the children have rendered, so the browser can focus the first field inside the modal.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Main Render
  return (
    <ModalContext value={{ close: onClose }}>
      <dialog
        {...ariaProps}
        ref={dialogRef}
        className={className ? `${styles.Modal} ${className}` : styles.Modal}
        onClose={() => {
          // The browser closed the dialog on its own (e.g. Escape), so let the parent update isOpen.
          if (isOpen) onClose();
        }}
      >
        {isOpen && children}
      </dialog>
    </ModalContext>
  );
}
