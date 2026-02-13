import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FaArrowLeft,
  FaAndroid,
  FaApple,
  FaEnvelope,
  FaEllipsisVertical,
  FaHeadset,
  FaHouse,
  FaLock,
  FaPlus,
  FaPencil,
  FaShareFromSquare,
  FaTrashCan,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { deleteCurrentAccount } from "@/lib/account";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { sendSupportEmail } from "@/lib/support";

const ACCOUNT_DELETE_PASSPHRASE = "DELETE EVERYTHING";

export default function Settings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [installPlatform, setInstallPlatform] = useState<"ios" | "android">(
    "ios",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isPreparingSupport, setIsPreparingSupport] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const isDeletePassphraseValid =
    deleteConfirmation.trim() === ACCOUNT_DELETE_PASSPHRASE;

  useEffect(() => {
    if (!user) return;
    setName(user.firstName || "");
    setEmail(user.email || "");
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: trimmedName,
          first_name: trimmedName,
          firstName: trimmedName,
        },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: trimmedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await queryClient.invalidateQueries({
        queryKey: ["supabase", "auth", "user"],
      });
      setIsEditingName(false);
      toast({
        title: "Name updated",
        description: "Your name has been updated.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not update name";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!user) return;

    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your inbox for a password reset link.",
        variant: "success",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not send reset email";
      toast({
        title: "Request failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleContactSupport = async () => {
    if (!user) return;
    const subject = supportSubject.trim();
    const message = supportMessage.trim();
    if (!subject) {
      toast({
        title: "Subject required",
        description: "Please enter a support subject.",
        variant: "destructive",
      });
      return;
    }
    if (!message) {
      toast({
        title: "Message required",
        description: "Please describe your issue before contacting support.",
        variant: "destructive",
      });
      return;
    }

    setIsPreparingSupport(true);
    try {
      await sendSupportEmail({
        name: user.firstName || "CatchLogs User",
        email: user.email,
        subject,
        message,
      });
      setSupportSubject("");
      setSupportMessage("");
      toast({
        title: "Message sent",
        description: "Support has received your request.",
        variant: "success",
      });
    } catch (error: unknown) {
      const errMessage =
        error instanceof Error
          ? error.message
          : "Could not send support request";
      toast({
        title: "Support failed",
        description: errMessage,
        variant: "destructive",
      });
    } finally {
      setIsPreparingSupport(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (!isDeletePassphraseValid) {
      toast({
        title: "Confirmation required",
        description: `Type "${ACCOUNT_DELETE_PASSPHRASE}" to confirm account deletion.`,
        variant: "destructive",
      });
      return;
    }

    const accepted = window.confirm(
      "Delete your account permanently? This cannot be undone.",
    );
    if (!accepted) return;

    setIsDeletingAccount(true);
    try {
      try {
        await deleteCurrentAccount();
      } catch (edgeError) {
        const { error } = await supabase.rpc("delete_my_account");
        if (error) {
          const edgeMessage =
            edgeError instanceof Error
              ? edgeError.message
              : "unknown edge function error";
          throw new Error(`${error.message} (edge fallback: ${edgeMessage})`);
        }
      }

      await supabase.auth.signOut();
      queryClient.clear();
      navigate("/auth");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not delete account";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const cancelNameEdit = () => {
    setName(user?.firstName || "");
    setIsEditingName(false);
  };

  return (
    <div className="page-scroll settings-scroll">
      <div className="page-content settings-page-content">
        <div className="page-header">
          <Link to="/">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft size={16} />
            </Button>
          </Link>
          <h1 className="page-title">Profile Settings</h1>
        </div>

        <div className="settings-stack">
          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  How to Install CatchLogs
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="settings-meta">
                Save CatchLogs to your home screen for quick and easy access!
              </p>
              <div className="settings-actions mb-8">
                <Button
                  type="button"
                  className={
                    installPlatform === "ios"
                      ? "btn-primary"
                      : "btn-outline-muted"
                  }
                  variant={installPlatform === "ios" ? "default" : "outline"}
                  onClick={() => setInstallPlatform("ios")}
                >
                  <FaApple size={16} />
                  iOS
                </Button>
                <Button
                  type="button"
                  className={
                    installPlatform === "android"
                      ? "btn-primary"
                      : "btn-outline-muted"
                  }
                  variant={
                    installPlatform === "android" ? "default" : "outline"
                  }
                  onClick={() => setInstallPlatform("android")}
                >
                  <FaAndroid size={16} />
                  Android
                </Button>
              </div>
              {installPlatform === "ios" ? (
                <div className="settings-form settings-meta">
                  <div className="flex items-center gap-2">
                    <span>
                      1. Tap the{" "}
                      <span className="inline-flex items-center gap-1">
                        Share <FaShareFromSquare size={12} />
                      </span>{" "}
                      button.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>
                      2. Tap{" "}
                      <span className="inline-flex items-center gap-1">
                        <FaPlus size={12} /> "Add to Home Screen"
                      </span>
                      .
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>3. Tap "Add".</span>
                  </div>
                </div>
              ) : (
                <div className="settings-form settings-meta">
                  <div className="flex items-center gap-2">
                    <span>
                      1. Tap the{" "}
                      <span className="inline-flex items-center gap-1">
                        menu <FaEllipsisVertical size={12} />
                      </span>{" "}
                      (three dots).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      2. Tap{" "}
                      <span className="inline-flex items-center gap-1">
                        <FaHouse size={12} /> "Install app"
                      </span>{" "}
                      or{" "}
                      <span className="inline-flex items-center gap-1">
                        <FaHouse size={12} /> "Add to Home screen"
                      </span>
                      .
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      3. Confirm by tapping{" "}
                      <span className="inline-flex items-center gap-1">
                        <FaPlus size={12} /> "Install"
                      </span>{" "}
                      or{" "}
                      <span className="inline-flex items-center gap-1">
                        <FaPlus size={12} /> "Add"
                      </span>
                      .
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  <FaEnvelope size={18} />
                  Email
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="settings-static-value">{email || "Not set"}</p>
            </CardContent>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  <FaUser size={18} />
                  Name
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="settings-edit-button"
                  onClick={() => setIsEditingName((prev) => !prev)}
                >
                  {isEditingName ? (
                    <FaXmark size={16} />
                  ) : (
                    <FaPencil size={16} />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!isEditingName ? (
                <p className="settings-static-value">
                  {user?.firstName || "Not set"}
                </p>
              ) : (
                <form onSubmit={handleUpdateName} className="settings-form">
                  <Input
                    className="field-dark"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                  <div className="settings-actions">
                    <Button
                      type="submit"
                      className="btn-primary"
                      disabled={isSavingName}
                    >
                      {isSavingName ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted"
                      onClick={cancelNameEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  <FaLock size={18} />
                  Password
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="settings-meta">
                Send a secure reset link to your account email.
              </p>
              <Button
                type="button"
                className="btn-primary btn-full"
                onClick={handleSendResetLink}
                disabled={isSendingReset}
              >
                {isSendingReset ? "Sending..." : "Send Password Reset Link"}
              </Button>
            </CardContent>
          </Card>

          <Card className="settings-card settings-card-danger">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title settings-card-title-danger">
                  <FaTrashCan size={18} />
                  Delete Account
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="settings-danger-copy">
                This permanently deletes your profile, pins, entries, and
                photos. If you wish to continue, type{" "}
                <strong className="settings-danger-strong">
                  "DELETE EVERYTHING"
                </strong>
              </div>
              <div className="settings-form">
                <Input
                  className="field-dark"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="type here"
                />
                <Button
                  type="button"
                  variant="destructive"
                  className="settings-delete-button btn-danger-solid"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || !isDeletePassphraseValid}
                >
                  {isDeletingAccount ? "Deleting..." : "Delete My Account"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  <FaHeadset size={18} />
                  Contact Support
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="settings-form">
                <Input
                  className="field-dark"
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="Subject"
                />
                <Textarea
                  className="field-dark settings-textarea"
                  rows={5}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe your issue (account transfer, email update, etc.)"
                />
                <Button
                  type="button"
                  className="btn-primary btn-full"
                  onClick={handleContactSupport}
                  disabled={isPreparingSupport}
                >
                  {isPreparingSupport ? "Sending..." : "Send to Support Inbox"}
                </Button>
                <p className="settings-meta">
                  This submits your request to CatchLogs support.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
