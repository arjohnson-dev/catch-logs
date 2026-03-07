/*
 * File:        src/pages/settings.tsx
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
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FaArrowLeft,
  FaAndroid,
  FaApple,
  FaChevronDown,
  FaChevronUp,
  FaEnvelope,
  FaEllipsisVertical,
  FaHeadset,
  FaLock,
  FaPencil,
  FaTrashCan,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import { IoShareOutline } from "react-icons/io5";
import { VscDiffAdded } from "react-icons/vsc";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { deleteCurrentAccount } from "@/lib/account";
import { useAuth } from "@/hooks/useAuth";
import {
  THIRD_PARTY_DISCLAIMER_PARAGRAPHS,
  THIRD_PARTY_PROVIDERS,
} from "@/lib/legal/third-party-disclaimer";
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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isPreparingSupport, setIsPreparingSupport] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isThirdPartyDisclaimerOpen, setIsThirdPartyDisclaimerOpen] =
    useState(false);
  const [isThirdPartyProvidersOpen, setIsThirdPartyProvidersOpen] =
    useState(false);
  const isDeletePassphraseValid =
    deleteConfirmation.trim() === ACCOUNT_DELETE_PASSPHRASE;

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setEmail(user.email || "");
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (!trimmedFirstName) {
      toast({
        title: "First name required",
        description: "Please enter your first name.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: trimmedFirstName,
          display_name: trimmedFirstName,
          name: trimmedFirstName,
          first_name: trimmedFirstName,
          firstName: trimmedFirstName,
          last_name: trimmedLastName,
          lastName: trimmedLastName,
        },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await queryClient.invalidateQueries({
        queryKey: ["supabase", "auth", "user"],
      });
      setIsEditingName(false);
      toast({
        title: "Profile updated",
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
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
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
              <p className="settings-meta">
                Save CatchLogs to your home screen for quick and easy access!
              </p>
            </CardHeader>
            <CardContent>
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
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>
                      Open CatchLogs in <strong>Safari</strong>.
                    </li>
                    <li>
                      Tap{" "}
                      <strong className="inline-flex items-center gap-1">
                        <IoShareOutline size={12} /> Share
                      </strong>{" "}
                      at the bottom of the screen.
                    </li>
                    <li>
                      Scroll down and tap{" "}
                      <strong className="inline-flex items-center gap-1">
                        <VscDiffAdded size={12} /> Add to Home Screen
                      </strong>
                      .
                    </li>
                    <li>
                      Make sure <strong>Open as Web App</strong> is enabled.
                    </li>
                    <li>
                      Tap <strong>Add</strong>.
                    </li>
                  </ol>
                  <p className="settings-meta">
                    Having trouble? Make sure you're using the latest version of
                    iOS and Safari. If issues persist, contact support at the
                    bottom of this page.
                  </p>
                </div>
              ) : (
                <div className="settings-form settings-meta">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>
                      Open CatchLogs in <strong>Chrome</strong>.
                    </li>
                    <li>
                      Tap{" "}
                      <strong className="inline-flex items-center gap-1">
                        <FaEllipsisVertical size={12} /> Three dots menu
                      </strong>{" "}
                      in the top-right corner.
                    </li>
                    <li>
                      Tap <strong>Add to Home screen</strong>.
                    </li>
                    <li>
                      Tap <strong>Add</strong>.
                    </li>
                  </ol>
                  <p className="settings-meta">
                    Having trouble? Make sure you're using the latest version of
                    Android and Chrome. If issues persist, contact support at
                    the bottom of this page.
                  </p>
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
                  {[user?.firstName, user?.lastName]
                    .filter((value) => Boolean(value && value.trim().length > 0))
                    .join(" ") || "Not set"}
                </p>
              ) : (
                <form onSubmit={handleUpdateName} className="settings-form">
                  <Input
                    className="field-dark"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                  <Input
                    className="field-dark"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
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

          <Card className="settings-card">
            <CardHeader>
              <div className="settings-card-header">
                <CardTitle className="settings-card-title">
                  Third-Party Data and APIs
                </CardTitle>
              </div>
              <p className="settings-meta">
                Information from external providers is subject to their
                availability and data quality.
              </p>
            </CardHeader>
            <CardContent>
              <div className="settings-form">
                <Collapsible
                  open={isThirdPartyDisclaimerOpen}
                  onOpenChange={setIsThirdPartyDisclaimerOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted w-full justify-between"
                    >
                      Third-Party Data and API Disclaimer
                      {isThirdPartyDisclaimerOpen ? (
                        <FaChevronUp size={14} />
                      ) : (
                        <FaChevronDown size={14} />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="settings-meta space-y-3">
                      {THIRD_PARTY_DISCLAIMER_PARAGRAPHS.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible
                  open={isThirdPartyProvidersOpen}
                  onOpenChange={setIsThirdPartyProvidersOpen}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted w-full justify-between"
                    >
                      Third-Party Providers
                      {isThirdPartyProvidersOpen ? (
                        <FaChevronUp size={14} />
                      ) : (
                        <FaChevronDown size={14} />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <div className="settings-meta space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="py-2 pr-3 font-semibold">
                                Provider
                              </th>
                              <th className="py-2 pr-3 font-semibold">Link</th>
                              <th className="py-2 pr-3 font-semibold">
                                Service
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {THIRD_PARTY_PROVIDERS.map((provider) => (
                              <tr
                                key={provider.name}
                                className="border-b border-border/60 align-top"
                              >
                                <td className="py-2 pr-3 font-medium">
                                  {provider.name}
                                </td>
                                <td className="py-2 pr-3">
                                  <a
                                    href={provider.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline"
                                  >
                                    {provider.url}
                                  </a>
                                </td>
                                <td className="py-2 pr-3">{provider.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p>
                        This list represents the third-party APIs and services
                        currently used by the application and may be updated as
                        integrations change.
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
