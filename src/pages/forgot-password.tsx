import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FaArrowLeft, FaCircleCheck, FaEnvelope } from "react-icons/fa6";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "Password reset email has been sent to your inbox",
        variant: "success",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not send password reset email";
      toast({
        title: "Failed to send email",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="center-card-shell">
        <Card className="center-card">
          <CardHeader className="center-card-header">
            <CardTitle className="flex items-center justify-center gap-2">
              <FaCircleCheck size={20} className="icon-success" />
              Email Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="center-card-content space-y-4">
            <p className="text-muted">
              If an account with that email exists, we've sent you a password reset link.
            </p>
            <p className="text-sm text-subtle">
              Check your email inbox and follow the instructions to reset your password.
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/')}
                className="btn-full btn-primary"
              >
                Back to Login
              </Button>
              <Button 
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="btn-full btn-ghost-muted"
              >
                Send Another Email
              </Button>
            </div>
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
            <FaEnvelope size={20} className="icon-primary" />
            Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-muted text-center text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  Sending...
                </>
              ) : (
                <>
                  <FaEnvelope className="h-4 w-4 mr-2" />
                  Send Reset Link
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
