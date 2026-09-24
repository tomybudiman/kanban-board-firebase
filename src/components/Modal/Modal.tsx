"use client";

import {
  type AnimationEvent,
  type Context,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./Modal.module.scss";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children?: ReactNode;
}

export interface ModalContextValue {
  close: () => void;
}

const ModalContext: Context<ModalContextValue | null> =
  createContext<ModalContextValue | null>(null);

// Lets any component rendered inside <Modal> ask the modal to close.
export function useModal(): ModalContextValue {
  const modal: ModalContextValue | null = useContext(ModalContext);
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
}: ModalProps): ReactElement {
  const dialogRef: RefObject<HTMLDialogElement | null> =
    useRef<HTMLDialogElement>(null);
  const isPressStartedOnBackdrop: RefObject<boolean> = useRef<boolean>(false);

  // Stays true until the closing animation has finished, so the content doesn't vanish mid-animation.
  const [isRendered, setIsRendered] = useState<boolean>(isOpen);
  if (isOpen && !isRendered) {
    setIsRendered(true);
  }
  const isClosing: boolean = !isOpen && isRendered;

  // Clicks on the backdrop and on the dialog's own padding both target the <dialog>, so tell them apart by position.
  function isOnBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
    if (event.target !== event.currentTarget) return false;
    const rect: DOMRect = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  // Open the native dialog after the children have rendered, so the browser can focus the first field inside the modal.
  // Closing happens in onAnimationEnd, once the closing animation is done.
  useEffect((): void => {
    const dialog: HTMLDialogElement | null = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      // React's autoFocus runs before the dialog opens, so focus a [data-autofocus] element here instead.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
  }, [isOpen]);

  const classNames: string = [
    styles.Modal,
    isClosing && styles["Modal--closing"],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Main Render
  return (
    <ModalContext value={{ close: onClose }}>
      <dialog
        {...ariaProps}
        ref={dialogRef}
        className={classNames}
        onCancel={(event: SyntheticEvent<HTMLDialogElement>): void => {
          // Escape: hand the close over to the parent so the closing animation can play.
          // Chrome sometimes makes this event non-cancelable; then the dialog closes right away and onClose below handles it.
          if (event.cancelable) {
            event.preventDefault();
            onClose();
          }
        }}
        onAnimationEnd={(event: AnimationEvent<HTMLDialogElement>): void => {
          if (
            isClosing &&
            event.target === event.currentTarget &&
            !event.pseudoElement
          ) {
            dialogRef.current?.close();
          }
        }}
        onClose={(): void => {
          setIsRendered(false);
          // The browser closed the dialog on its own, so let the parent update isOpen.
          if (isOpen) onClose();
        }}
        onPointerDown={(event: PointerEvent<HTMLDialogElement>): void => {
          isPressStartedOnBackdrop.current = isOnBackdrop(event);
        }}
        onClick={(event: MouseEvent<HTMLDialogElement>): void => {
          // Only close when the whole click happened on the backdrop, not when a text selection was dragged out of the modal.
          if (isPressStartedOnBackdrop.current && isOnBackdrop(event)) {
            onClose();
          }
        }}
      >
        {isRendered && children}
      </dialog>
    </ModalContext>
  );
}
