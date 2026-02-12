import { useState } from "react";
import { FaArrowLeft, FaHeadset } from "react-icons/fa6";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendSupportEmail } from "@/lib/support";

export default function Support() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
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

  return (
    <div className="page-scroll settings-scroll">
      <div className="page-content settings-page-content">
        <div className="page-header">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft size={16} />
            </Button>
          </Link>
          <h1 className="page-title">Contact Support</h1>
        </div>

        <Card className="settings-card">
          <CardHeader>
            <CardTitle className="settings-card-title">
              <FaHeadset size={18} />
              Support Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!submitted ? (
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
            ) : (
              <div className="settings-form">
                <p className="settings-static-value">Your support request was sent.</p>
                <p className="settings-meta">We received your message and will reply to your return email.</p>
                <Button
                  type="button"
                  className="btn-primary btn-full"
                  onClick={() => {
                    setSubmitted(false);
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
