import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FaArrowLeft, FaCircleCheck, FaLock } from "react-icons/fa6";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initializeRecoverySession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hasRecoveryToken = hashParams.get("type") === "recovery";

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!error && (data.session || hasRecoveryToken)) {
        setIsReady(true);
        return;
      }

      toast({
        title: "Invalid link",
        description: "This password reset link is invalid or expired.",
        variant: "destructive",
      });
      navigate("/forgot-password");
    };

    initializeRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setIsReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Passwords required",
        description: "Please fill in both password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      setResetSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now log in with your new password.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not reset password. The link may be expired.";
      toast({
        title: "Reset failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady && !resetSuccess) {
    return (
      <div className="center-card-shell">
        <Card className="center-card">
          <CardContent className="py-8 text-center text-muted">
            Validating reset link...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="center-card-shell">
        <Card className="center-card">
          <CardHeader className="center-card-header">
            <CardTitle className="flex items-center justify-center gap-2">
              <FaCircleCheck size={20} className="icon-success" />
              Password Reset
            </CardTitle>
          </CardHeader>
          <CardContent className="center-card-content space-y-4">
            <p className="text-muted">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            
            <Button 
              onClick={() => navigate('/')}
              className="btn-full btn-primary"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="center-card-shell">
      <Card className="center-card">
        <CardHeader className="center-card-header">
          <CardTitle className="flex items-center justify-center gap-2">
            <FaLock size={20} className="icon-primary" />
            Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-muted text-center text-sm">
              Enter your new password below
            </p>
            
            <div>
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="field-dark"
              />
            </div>
            
            <div>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="field-dark"
              />
            </div>
            
            <Button 
              type="submit"
              disabled={isLoading}
              className="btn-full btn-primary"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Resetting...
                </>
              ) : (
                <>
                  <FaLock className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
            
            <Button 
              type="button"
              variant="ghost" 
              onClick={() => navigate('/')}
              className="btn-full btn-ghost-muted"
            >
              <FaArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
