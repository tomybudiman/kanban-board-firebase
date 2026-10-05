"use client";

import { faArrowRightFromBracket } from "@fortawesome/pro-solid-svg-icons";
import { type ReactElement, useEffect, useState } from "react";

import Button from "@/components/Button/Button";
import AuthCard from "@/features/auth/components/AuthCard/AuthCard";
import {
  type AuthContextValue,
  useAuth,
} from "@/features/auth/components/AuthProvider/AuthProvider";
import authService, {
  getAuthErrorMessage,
} from "@/features/auth/services/authService";

import styles from "./VerifyEmail.module.scss";

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

// How long the resend button stays disabled after an email is sent, so Firebase's sending limit isn't hit.
const resendCooldownSeconds: number = 60;

/**
 * @description The page shown to signed-in users whose email isn't verified yet. It checks the verification status by itself when the page opens and whenever the tab becomes visible again (for example after clicking the link in the email), and offers buttons to check now, send the email again, or sign out. Once the email is verified, AuthGuard moves the page to the board.
 */
export default function VerifyEmail(): ReactElement {
  const { user }: AuthContextValue = useAuth();
  const [isChecking, setCheckingState] = useState<boolean>(false);
  const [isSending, setSendingState] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  /**
   * @description Right after registering, reports whether the first verification email was sent. The register form was already gone when sending finished, so this page is the only place to show it.
   */
  useEffect((): void => {
    authService
      .takeSignUpVerificationEmail()
      ?.then((): void => {
        setMessage({
          type: "success",
          text: "Registrasi berhasil! Cek email untuk verifikasi.",
        });
      })
      .catch((error: unknown): void => {
        setMessage({
          type: "error",
          text: `Registrasi berhasil, tapi email verifikasi gagal dikirim. ${getAuthErrorMessage(error)} Tekan "Kirim Ulang Email" untuk mencoba lagi.`,
        });
      });
  }, []);

  /**
   * @description Checks the status quietly when the page opens and when the user comes back to this tab. Errors are ignored here; the "Saya Sudah Verifikasi" button shows them.
   */
  useEffect((): (() => void) => {
    const checkQuietly: () => void = (): void => {
      authService.refreshVerificationStatus().catch((): void => {});
    };
    const onVisibilityChange: () => void = (): void => {
      if (document.visibilityState === "visible") {
        checkQuietly();
      }
    };
    checkQuietly();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return (): void => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  /**
   * @description Counts the resend cooldown down by one second at a time.
   */
  useEffect((): (() => void) | void => {
    if (cooldown <= 0) {
      return;
    }
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => {
      setCooldown((seconds: number): number => seconds - 1);
    }, 1000);
    return (): void => clearTimeout(timer);
  }, [cooldown]);

  /**
   * @description Asks Firebase for the latest status. When the email is verified, AuthGuard moves on to the board; otherwise the user is told to click the link first.
   */
  const onClickCheckVerification: () => Promise<void> =
    async (): Promise<void> => {
      setCheckingState(true);
      setMessage(null);
      try {
        const isVerified: boolean =
          await authService.refreshVerificationStatus();
        if (!isVerified) {
          setMessage({
            type: "error",
            text: "Email belum diverifikasi. Klik link di email terlebih dahulu, lalu coba lagi.",
          });
        }
      } catch (error: unknown) {
        setMessage({ type: "error", text: getAuthErrorMessage(error) });
      } finally {
        setCheckingState(false);
      }
    };

  /**
   * @description Sends the verification email again, then disables the button for a minute.
   */
  const onClickResendEmail: () => Promise<void> = async (): Promise<void> => {
    setSendingState(true);
    setMessage(null);
    try {
      await authService.resendVerificationEmail();
      setMessage({
        type: "success",
        text: `Email verifikasi sudah dikirim ulang ke ${user?.email ?? "email akun ini"}.`,
      });
      setCooldown(resendCooldownSeconds);
    } catch (error: unknown) {
      setMessage({ type: "error", text: getAuthErrorMessage(error) });
    } finally {
      setSendingState(false);
    }
  };

  /**
   * @description Signs out, for example when the account was registered with a mistyped email. AuthGuard then moves the page to /login.
   */
  const onClickSignOut: () => Promise<void> = async (): Promise<void> => {
    try {
      await authService.signOut();
    } catch (error: unknown) {
      console.error("Gagal keluar dari akun:", error);
    }
  };

  let resendLabel: string = "Kirim Ulang Email";
  if (isSending) {
    resendLabel = "Mengirim...";
  } else if (cooldown > 0) {
    resendLabel = `Kirim Ulang Email (${cooldown})`;
  }

  // Main Render
  return (
    <AuthCard title="Verifikasi Email">
      <div className={styles.VerifyEmail}>
        <p className={styles.VerifyEmail__instructionText}>
          Verifikasi <strong>{user?.email}</strong> lewat link yang dikirim
          Firebase ke email tersebut. Klik link-nya, lalu kembali ke halaman
          ini.
        </p>
        {message && (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={
              message.type === "error"
                ? styles.VerifyEmail__error
                : styles.VerifyEmail__success
            }
          >
            {message.text}
          </p>
        )}
        <div className={styles.VerifyEmail__actions}>
          <Button
            size="large"
            disabled={isChecking}
            onClick={(): void => {
              void onClickCheckVerification();
            }}
            className={styles.VerifyEmail__actions__button}
          >
            {isChecking ? "Memeriksa..." : "Saya Sudah Verifikasi"}
          </Button>
          <Button
            size="large"
            color="neutral"
            variant="outlined"
            disabled={isSending || cooldown > 0}
            onClick={(): void => {
              void onClickResendEmail();
            }}
            className={styles.VerifyEmail__actions__button}
          >
            {resendLabel}
          </Button>
          <Button
            size="large"
            variant="text"
            color="neutral"
            startIcon={faArrowRightFromBracket}
            onClick={(): void => {
              void onClickSignOut();
            }}
            className={styles.VerifyEmail__actions__button}
          >
            Keluar
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}
