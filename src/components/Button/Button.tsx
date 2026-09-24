import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type ComponentProps, type ReactElement } from "react";

import styles from "./Button.module.scss";

export type ButtonColor =
  "primary" | "secondary" | "danger" | "warning" | "neutral";
export type ButtonVariant = "solid" | "outlined" | "text";
export type ButtonSize = "small" | "medium" | "large";

interface ButtonProps extends ComponentProps<"button"> {
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: IconDefinition;
  endIcon?: IconDefinition;
}

export default function Button({
  color = "primary",
  variant = "solid",
  size = "medium",
  type = "button",
  startIcon,
  endIcon,
  className,
  children,
  ...props
}: ButtonProps): ReactElement {
  const isIconOnly: boolean = !children && Boolean(startIcon || endIcon);
  const classNames: string = [
    styles.Button,
    styles[`Button--${color}`],
    styles[`Button--${variant}`],
    styles[`Button--${size}`],
    isIconOnly && styles["Button--iconOnly"],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Main Render
  return (
    <button {...props} type={type} className={classNames}>
      {startIcon && <FontAwesomeIcon icon={startIcon} />}
      {children}
      {endIcon && <FontAwesomeIcon icon={endIcon} />}
    </button>
  );
}
