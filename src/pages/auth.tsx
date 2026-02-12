import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import catchLogsIcon from "@assets/CatchLogs Icon_1750292637902.png";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
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

  const [isLogin, setIsLogin] = useState(true);
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
    <div className="page-scroll">
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

        <Card className="auth-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center mb-4">
              {/* Toggle Switch */}
              <div className="auth-toggle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsLogin(true);
                    setVerificationMessage(null); // Clear message when switching tabs
                  }}
                  className={`auth-toggle-button ${
                    isLogin 
                      ? "auth-toggle-button-active" 
                      : "auth-toggle-button-inactive"
                  }`}
                >
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsLogin(false);
                    setVerificationMessage(null); // Clear message when switching tabs
                  }}
                  className={`auth-toggle-button ${
                    !isLogin 
                      ? "auth-toggle-button-active" 
                      : "auth-toggle-button-inactive"
                  }`}
                >Register</Button>
              </div>
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

        {/* Terms and Privacy Links */}
        <div className="auth-links">
          <Link to="/terms" className="auth-link-button">
            Terms of Service
          </Link>
          <span className="text-[#64748b]">•</span>
          <Link to="/privacy" className="auth-link-button">
            Privacy Policy
          </Link>
          <span className="text-[#64748b]">•</span>
          <Link to="/support" className="auth-link-button">
            Contact Support
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
