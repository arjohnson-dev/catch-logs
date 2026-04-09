/*
 * File:        src/pages/support.tsx
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
import { useState } from "react";
import { FaHeadset } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { sendSupportEmail } from "@/lib/support";

const SUPPORT_SUBJECT_OPTIONS = [
  "Support Request",
  "Bug Report",
  "Feedback",
  "Suggestion",
  "Other (please type)",
] as const;

type SupportSubjectOption = (typeof SUPPORT_SUBJECT_OPTIONS)[number] | "";

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [supportSubjectOption, setSupportSubjectOption] = useState<SupportSubjectOption>("");
  const [supportCustomSubject, setSupportCustomSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast({
        title: "All fields are required",
        description: "Please complete every field before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (website.trim()) {
      toast({
        title: "Request blocked",
        description: "Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendSupportEmail({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        website,
      });

      setSubmitted(true);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Could not send support request";
      toast({
        title: "Support failed",
        description: errMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignedInSubmit = async () => {
    if (!user) return;

    const selectedSubject = supportSubjectOption.trim();
    const customSubject = supportCustomSubject.trim();
    const resolvedSubject =
      supportSubjectOption === "Other (please type)"
        ? customSubject
        : selectedSubject;
    const resolvedMessage = message.trim();

    if (!selectedSubject) {
      toast({
        title: "Subject required",
        description: "Please choose a support subject.",
        variant: "destructive",
      });
      return;
    }

    if (supportSubjectOption === "Other (please type)" && !customSubject) {
      toast({
        title: "Subject required",
        description: "Please enter a custom subject for Other.",
        variant: "destructive",
      });
      return;
    }

    if (!resolvedMessage) {
      toast({
        title: "Message required",
        description: "Please describe your issue before contacting support.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendSupportEmail({
        name: user.firstName || "CatchLogs User",
        email: user.email,
        subject: resolvedSubject,
        message: resolvedMessage,
      });

      setSubmitted(true);
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Could not send support request";
      toast({
        title: "Support failed",
        description: errMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-scroll settings-scroll">
      <div className="page-content settings-page-content">
        <div className="page-header">
          <h1 className="page-title">Contact Support</h1>
        </div>

        <Card className="settings-card surface-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <FaHeadset size={18} />
              Contact Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              user ? (
                <div className="settings-form">
                  <select
                    className="field-dark settings-support-subject-select"
                    value={supportSubjectOption}
                    onChange={(e) =>
                      setSupportSubjectOption(
                        e.target.value as SupportSubjectOption,
                      )
                    }
                  >
                    <option value="">Choose a subject</option>
                    {SUPPORT_SUBJECT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {supportSubjectOption === "Other (please type)" && (
                    <Input
                      className="field-dark"
                      value={supportCustomSubject}
                      onChange={(e) => setSupportCustomSubject(e.target.value)}
                      placeholder="Type custom subject"
                    />
                  )}
                  <Textarea
                    className="field-dark settings-textarea"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Suggestions and feedback help shape future updates."
                  />
                  <Button
                    type="button"
                    className="btn-primary btn-full"
                    onClick={handleSignedInSubmit}
                    disabled={
                      isSubmitting ||
                      !supportSubjectOption ||
                      (supportSubjectOption === "Other (please type)" &&
                        !supportCustomSubject.trim())
                    }
                  >
                    {isSubmitting ? "Sending..." : "Send"}
                  </Button>
                  <p className="settings-meta">
                    While we make every effort to review and respond to support
                    requests as quickly as possible, response times may vary
                    depending on message volume and availability. We appreciate
                    your patience.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="settings-form">
                  <div className="settings-actions">
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
                  </div>
                  <Input
                    type="email"
                    className="field-dark"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Return email"
                  />
                  <Input
                    className="field-dark"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                  />
                  <Textarea
                    className="field-dark settings-textarea"
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue"
                  />
                  <input
                    className="support-honeypot"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Leave this blank"
                  />
                  <Button type="submit" className="btn-primary btn-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Support Request"}
                  </Button>
                </form>
              )
            ) : (
              <div className="settings-form">
                <p className="settings-static-value">Your support request was sent.</p>
                <p className="settings-meta">We received your message and will reply to your return email.</p>
                <Button
                  type="button"
                  className="btn-primary btn-full"
                  onClick={() => {
                    setSubmitted(false);
                    setSupportSubjectOption("");
                    setSupportCustomSubject("");
                    setSubject("");
                    setMessage("");
                    setWebsite("");
                  }}
                >
                  Send Another Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
