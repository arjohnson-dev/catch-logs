import { Link } from "wouter";
import MarkupPage from "@/components/markup-page";

export default function Terms() {
  return (
    <MarkupPage
      title="Terms of Service"
      downloadFileName="catchlogs-terms-of-service.txt"
    >
          <p>
            Welcome to <strong>Catch Logs</strong>! By accessing or using our app, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the app.
          </p>

          <h2>1. Eligibility</h2>
          <p>
            You must be at least <strong>16 years old</strong> to use Catch Logs. By using the app, you confirm that you meet this requirement.
          </p>

          <h2>2. User Accounts</h2>
          <p>
            To use certain features, you may be required to create an account. When doing so, you must provide accurate and complete information, including your <strong>name and email address</strong>. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
          </p>

          <h2>3. Data Collection and Use</h2>
          <p>We collect and store certain personal information, including:</p>
          <ul>
            <li>Your <strong>name</strong></li>
            <li>Your <strong>email address</strong></li>
          </ul>
          <p>
            By using Catch Logs, you consent to our collection and use of this information as described in our <Link to="/privacy">Privacy Policy</Link>, including the <strong>sale of anonymized and aggregated data to advertisers</strong> and third parties for marketing or analytics purposes.
          </p>
          <p>
            We do <strong>not</strong> knowingly collect data from anyone under the age of 16.
          </p>

          <h2>4. User Conduct</h2>
          <p>You agree to use the app for lawful purposes only. You must not:</p>
          <ul>
            <li>Use the app to upload or share unlawful, harmful, or offensive content</li>
            <li>Attempt to disrupt or interfere with the app's security or functionality</li>
            <li>Use automated means to access the app without our permission</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, trademarks, and software on the Catch Logs app are the property of Catch Logs or its licensors. You may not reproduce, distribute, or modify any part of the app without our prior written consent.
          </p>

          <h2>6. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the app at any time, with or without notice, for any violation of these Terms.
          </p>

          <h2>7. Disclaimer</h2>
          <p>
            Catch Logs is provided "as is" and "as available." We make no warranties of any kind regarding the reliability, availability, or accuracy of the app.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Catch Logs shall not be liable for any indirect, incidental, or consequential damages arising out of or related to your use of the app.
          </p>

          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. If we make significant changes, we will notify users via email or in-app notice. Continued use of the app after changes constitutes acceptance.
          </p>

          <h2>10. Contact</h2>
          <p>
            If you have questions or concerns about these Terms, you can contact us at:<br />
            <strong>Email:</strong> arjohnson.dev@gmail.com
          </p>
    </MarkupPage>
  );
}
