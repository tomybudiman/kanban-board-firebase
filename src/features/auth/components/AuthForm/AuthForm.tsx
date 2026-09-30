"use client";

import Link from "next/link";
import { type ReactElement, useId } from "react";
import {
  type SubmitHandler,
  type UseFormReturn,
  useForm,
} from "react-hook-form";

import Button from "@/components/Button/Button";
import FieldError from "@/components/FieldError/FieldError";
import authService, {
  getAuthErrorMessage,
} from "@/features/auth/services/authService";

import styles from "./AuthForm.module.scss";

export type AuthFormMode = "login" | "register";

interface AuthFormProps {
  mode: AuthFormMode;
}

interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthFormContent {
  title: string;
  subtitle: string;
  submitLabel: string;
  switchText: string;
  switchLabel: string;
  switchHref: string;
}

const contents: Record<AuthFormMode, AuthFormContent> = {
  login: {
    title: "Masuk",
    subtitle: "Masuk untuk melihat dan mengelola task di papan.",
    submitLabel: "Masuk",
    switchText: "Belum punya akun?",
    switchLabel: "Daftar",
    switchHref: "/register",
  },
  register: {
    title: "Buat Akun",
    subtitle: "Daftar dengan email dan password untuk mulai memakai papan.",
    submitLabel: "Daftar",
    switchText: "Sudah punya akun?",
    switchLabel: "Masuk",
    switchHref: "/login",
  },
};

const emailPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Firebase's own minimum for email/password accounts.
const minPasswordLength: number = 6;

/**
 * @description The login form, or the register form when mode is "register" (which adds a password confirmation and a minimum password length).
 */
export default function AuthForm({ mode }: AuthFormProps): ReactElement {
  const id: string = useId();
  const content: AuthFormContent = contents[mode];
  const isRegister: boolean = mode === "register";
  const {
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  }: UseFormReturn<AuthFormValues> = useForm<AuthFormValues>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  /**
   * @description Signs in, or creates the account (which also signs in). There's no redirect here: as soon as Firebase reports the signed-in user, AuthGuard moves the page to the board. If Firebase refuses, the reason is shown above the button.
   */
  const submit: SubmitHandler<AuthFormValues> = async (
    values: AuthFormValues,
  ): Promise<void> => {
    const email: string = values.email.trim();
    try {
      if (isRegister) {
        await authService.signUp(email, values.password);
      } else {
        await authService.signIn(email, values.password);
      }
    } catch (error: unknown) {
      setError("root", { message: getAuthErrorMessage(error) });
    }
  };

  // Main Render
  return (
    <main className={styles.AuthForm}>
      <div className={styles.AuthForm__card}>
        <div className={styles.AuthForm__header}>
          <h1>{content.title}</h1>
          <p>{content.subtitle}</p>
        </div>
        <form
          noValidate
          className={styles.AuthForm__form}
          onSubmit={handleSubmit(submit)}
        >
          <div className={styles.AuthForm__form__field}>
            <label htmlFor={`${id}-email`}>Email</label>
            <input
              id={`${id}-email`}
              type="email"
              autoFocus
              autoComplete="email"
              placeholder="nama@email.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={`${id}-email-error`}
              {...register("email", {
                validate: (value: string): true | string => {
                  if (value.trim() === "") return "Email wajib diisi";
                  return (
                    emailPattern.test(value.trim()) ||
                    "Format email tidak valid"
                  );
                },
              })}
            />
            <FieldError
              id={`${id}-email-error`}
              message={errors.email?.message}
            />
          </div>
          <div className={styles.AuthForm__form__field}>
            <label htmlFor={`${id}-password`}>Password</label>
            <input
              id={`${id}-password`}
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder={
                isRegister ? `Minimal ${minPasswordLength} karakter` : undefined
              }
              aria-invalid={Boolean(errors.password)}
              aria-describedby={`${id}-password-error`}
              {...register("password", {
                required: "Password wajib diisi",
                minLength: isRegister
                  ? {
                      value: minPasswordLength,
                      message: `Password minimal ${minPasswordLength} karakter`,
                    }
                  : undefined,
                deps: isRegister ? "confirmPassword" : undefined,
              })}
            />
            <FieldError
              id={`${id}-password-error`}
              message={errors.password?.message}
            />
          </div>
          {isRegister && (
            <div className={styles.AuthForm__form__field}>
              <label htmlFor={`${id}-confirmPassword`}>
                Konfirmasi Password
              </label>
              <input
                id={`${id}-confirmPassword`}
                type="password"
                autoComplete="new-password"
                placeholder="Ketik ulang password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={`${id}-confirmPassword-error`}
                {...register("confirmPassword", {
                  required: "Konfirmasi password wajib diisi",
                  validate: (
                    value: string,
                    values: AuthFormValues,
                  ): true | string =>
                    value === values.password || "Password tidak sama",
                })}
              />
              <FieldError
                id={`${id}-confirmPassword-error`}
                message={errors.confirmPassword?.message}
              />
            </div>
          )}
          {errors.root?.message && (
            <p role="alert" className={styles.AuthForm__form__error}>
              {errors.root.message}
            </p>
          )}
          <Button
            size="large"
            type="submit"
            disabled={isSubmitting}
            className={styles.AuthForm__form__submit}
          >
            {isSubmitting ? "Memproses..." : content.submitLabel}
          </Button>
        </form>
        <p className={styles.AuthForm__switch}>
          {content.switchText}{" "}
          <Link href={content.switchHref}>{content.switchLabel}</Link>
        </p>
      </div>
    </main>
  );
}
