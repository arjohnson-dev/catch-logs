/*
 * File:        src/pages/auth.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import catchLogsIcon from "@assets/catchlogs-icon.png";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import { LandingFooter } from "@/pages/landing";

interface AuthPageProps {
  mode: "login" | "register";
  onAuthSuccess: () => void;
}

export default function AuthPage({ mode, onAuthSuccess }: AuthPageProps) {
  const verification = new URLSearchParams(window.location.search).get("verification");
  const initialVerificationMessage =
    verification === "success"
      ? {
          type: "success" as const,
          message: "Email verified successfully! You can now sign in to your account.",
        }
      : verification === "failed"
        ? {
            type: "error" as const,
            message: "Email verification failed. The link may be invalid or expired.",
          }
        : null;

  const isLogin = mode === "login";
  const [verificationMessage, setVerificationMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(initialVerificationMessage);

  useEffect(() => {
    if (verification) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [verification]);

  return (
    <main className="page-scroll" role="main">
      <div className="auth-shell">
        <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-row">
            <div className="auth-logo-badge">
              <img src={catchLogsIcon} alt="CatchLogs" width={40} height={40} />
            </div>
            <h1 className="auth-logo-title">CatchLogs</h1>
          </div>
          <p className="auth-logo-subtitle">Your digital fishing journal</p>
        </div>

        {/* Verification Message */}
        {verificationMessage && (
          <Alert className={`auth-status-alert ${
            verificationMessage.type === 'success' 
              ? 'auth-status-alert-success' 
              : 'auth-status-alert-error'
          }`}>
            <div className="auth-status-row">
              {verificationMessage.type === 'success' ? (
                <FaCircleCheck size={16} className="icon-success" />
              ) : (
                <FaCircleXmark size={16} className="icon-error" />
              )}
              <AlertDescription className={
                verificationMessage.type === 'success' 
                  ? 'auth-status-text-success' 
                  : 'auth-status-text-error'
              }>
                {verificationMessage.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <Card className="auth-card surface-card">
          <CardHeader className="pb-4">
            <div className="auth-card-heading">
              <h2>{isLogin ? "Sign in" : "Create your account"}</h2>
              <p>
                {isLogin
                  ? "Log catches, check patterns, and get back to your map."
                  : "Start a private fishing journal built around your spots, notes, and conditions."}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <LoginForm onSuccess={onAuthSuccess} />
            ) : (
              <RegisterForm onSuccess={onAuthSuccess} />
            )}
          </CardContent>
        </Card>

        <div className="auth-links auth-switch-link">
          <Link
            to={isLogin ? "/register" : "/login"}
            className="auth-link-button"
            onClick={() => setVerificationMessage(null)}
          >
            {isLogin ? "Create account" : "Sign in"}
          </Link>
        </div>
        </div>
        <LandingFooter />
      </div>
    </main>
  );
}
