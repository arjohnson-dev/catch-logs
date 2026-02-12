import { useRef } from "react";
import { FaArrowLeft } from "react-icons/fa6";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FaDownload } from "react-icons/fa6";

export default function Privacy() {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const text = contentRef.current?.innerText?.trim();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "catchlogs-privacy-policy.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-scroll">
      <div className="page-content page-content-prose">
        <div className="page-header">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">Privacy Policy</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="btn-outline-muted ml-auto"
            onClick={handleDownload}
          >
            <FaDownload className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <div ref={contentRef} className="terms-privacy-prose">
          <p>
            This Privacy Policy describes how <strong>Catch Logs</strong> collects, uses, and shares your information when you use our mobile application ("App"). By using the App, you agree to the terms outlined below.
          </p>

          <h2>1. Information We Collect</h2>
          <p>We collect the following personal information when you create an account:</p>
          <ul>
            <li><strong>Name</strong></li>
            <li><strong>Email address</strong></li>
          </ul>
          <p>
            This information is used to identify your account, communicate with you, and improve your experience.
          </p>
          <p>
            We do <strong>not</strong> knowingly collect personal data from users under the age of <strong>16</strong>. If we become aware that we have collected such data, we will delete it promptly.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information for the following purposes:</p>
          <ul>
            <li>To create and manage your user account</li>
            <li>To provide, personalize, and improve the App</li>
            <li>To send transactional and promotional emails</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            We may also use aggregated and anonymized data for <strong>analytics</strong> and to <strong>sell insights to advertisers</strong> and third-party partners.
          </p>

          <h2>3. Sharing Your Information</h2>
          <p>We may share your information in the following cases:</p>
          <ul>
            <li><strong>With service providers</strong> who help us operate and improve the App</li>
            <li><strong>With advertisers and partners</strong> (only anonymized and aggregated data)</li>
            <li><strong>To comply with legal requests</strong>, such as subpoenas or law enforcement inquiries</li>
          </ul>
          <p>
            We do <strong>not sell your personal information</strong> (e.g., name or email) directly. Any shared data is anonymized and aggregated.
          </p>

          <h2>4. Data Retention</h2>
          <p>
            We retain your personal data as long as your account is active or as needed to provide services. You may request account deletion at any time by contacting us at the email below.
          </p>

          <h2>5. Your Rights</h2>
          <p>Depending on your location, you may have certain rights regarding your personal data, including:</p>
          <ul>
            <li>The right to access your data</li>
            <li>The right to request correction or deletion</li>
            <li>The right to object to certain uses of your data</li>
          </ul>
          <p>To exercise these rights, please contact us.</p>

          <h2>6. Security</h2>
          <p>
            We use commercially reasonable measures to protect your information. However, no system can guarantee absolute security.
          </p>

          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If changes are significant, we will notify you via email or in-app message.
          </p>

          <h2>8. Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at:<br />
            <strong>Email:</strong> arjohnson.dev@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
