import { type ReactElement } from "react";

import styles from "./FieldError.module.scss";

interface FieldErrorProps {
  id: string;
  message?: string;
}

/**
 * @description Shows a form field's validation message, or nothing when the field is valid. The field points to it with aria-describedby={id}.
 */
export default function FieldError({
  id,
  message,
}: FieldErrorProps): ReactElement | null {
  if (!message) return null;

  // Main Render
  return (
    <p id={id} className={styles.FieldError}>
      {message}
    </p>
  );
}
