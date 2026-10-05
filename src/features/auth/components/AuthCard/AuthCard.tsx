import { type ReactElement, type ReactNode } from "react";

import styles from "./AuthCard.module.scss";

interface AuthCardProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * @description The white card in the middle of the screen shared by the login, register, and verify-email pages: a title, a short subtitle, and the page's content below them.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
}: AuthCardProps): ReactElement {
  // Main Render
  return (
    <main className={styles.AuthCard}>
      <div className={styles.AuthCard__panel}>
        <div className={styles.AuthCard__header}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
