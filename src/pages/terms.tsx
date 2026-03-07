/*
 * File:        src/pages/terms.tsx
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
import { Link } from "wouter";
import MarkupPage from "@/components/markup-page";

export default function Terms() {
  return (
    <MarkupPage
      title="Terms of Service"
      downloadFileName="catchlogs-terms-of-service.txt"
    >
      <p>
        <strong>Effective Date:</strong> March 4, 2026
      </p>
      <p>
        Welcome to <strong>Catch Logs</strong>. These Terms of Service
        ("Terms") govern your access to and use of the Catch Logs application,
        website, and related services (collectively, the "App"). By accessing
        or using the App, you agree to be bound by these Terms. If you do not
        agree, you must not use the App.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least <strong>16 years old</strong> to use the App. By
        accessing or using Catch Logs, you represent and warrant that you meet
        this age requirement.
      </p>

      <h2>2. User Accounts</h2>
      <p>
        Certain features of the App may require you to create an account. When
        creating an account, you agree to provide accurate and complete
        information, including your <strong>name and email address</strong>.
      </p>
      <p>
        You are responsible for maintaining the confidentiality of your login
        credentials and for all activities that occur under your account. You
        agree to notify us promptly if you suspect unauthorized access to your
        account.
      </p>
      <p>
        We reserve the right to suspend or terminate accounts that violate
        these Terms or misuse the App.
      </p>

      <h2>3. Data Collection and Use</h2>
      <p>
        We collect and store certain information necessary to operate the App,
        including:
      </p>
      <ul>
        <li>
          Your <strong>name</strong>
        </li>
        <li>
          Your <strong>email address</strong>
        </li>
      </ul>
      <p>
        By using the App, you consent to our collection, storage, and use of
        this information as described in our{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
      <p>
        This may include the <strong>sharing or sale of anonymized and aggregated data</strong>{" "}
        to advertisers or third parties for marketing, analytics, or research
        purposes. Such data will not contain personally identifiable
        information.
      </p>
      <p>
        We do <strong>not knowingly collect personal information from users under the age of 16</strong>.
      </p>

      <h2>4. User Conduct</h2>
      <p>
        You agree to use the App only for lawful purposes and in accordance
        with these Terms. You agree not to:
      </p>
      <ul>
        <li>
          Upload, share, or distribute unlawful, harmful, or offensive content
        </li>
        <li>
          Attempt to disrupt, damage, or interfere with the App&apos;s systems
          or security
        </li>
        <li>
          Use automated scripts, bots, or scraping tools without permission
        </li>
        <li>
          Attempt to reverse engineer, decompile, or extract the source code of
          the App where prohibited by law
        </li>
      </ul>
      <p>
        Violation of these rules may result in account suspension or
        termination.
      </p>

      <h2>5. User Content</h2>
      <p>
        The App may allow users to submit or create content, including fishing
        logs, notes, location information, images, or other materials ("User
        Content").
      </p>
      <p>
        You retain ownership of your User Content. However, by submitting
        content through the App, you grant Catch Logs a{" "}
        <strong>non-exclusive, worldwide, royalty-free license</strong> to
        store, process, display, and use that content as necessary to operate,
        maintain, and improve the App.
      </p>
      <p>
        You represent that you have the rights necessary to submit any User
        Content you provide.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        All software, design, trademarks, logos, and other materials associated
        with Catch Logs are the property of Catch Logs or its licensors and are
        protected by applicable intellectual property laws.
      </p>
      <p>
        You may not reproduce, modify, distribute, or create derivative works
        from any portion of the App without prior written permission.
      </p>

      <h2>7. Service Availability</h2>
      <p>
        We may modify, suspend, or discontinue any part of the App at any time
        without notice. We are not liable if the App becomes unavailable for
        any reason.
      </p>

      <h2>8. General Disclaimer</h2>
      <p>
        The App is provided <strong>&quot;as is&quot; and &quot;as available&quot;</strong> without
        warranties of any kind, whether express or implied. This includes, but
        is not limited to, warranties of merchantability, fitness for a
        particular purpose, or non-infringement.
      </p>
      <p>
        We do not guarantee that the App will always be accurate, reliable,
        secure, or free from errors.
      </p>

      <h2>9. Third-Party Data and Services</h2>
      <p>
        Certain features of the App rely on data or functionality provided by{" "}
        <strong>third-party services and APIs</strong>, including mapping
        services, environmental data providers, and other external platforms.
      </p>
      <p>
        We do not create, control, verify, or independently validate all
        information obtained from these sources. As a result, we make no
        representations or warranties regarding the{" "}
        <strong>accuracy, completeness, reliability, availability, or timeliness</strong>{" "}
        of such information.
      </p>
      <p>
        Third-party data may be outdated, incomplete, incorrectly rendered, or
        may not reflect current real-world conditions. Your use of information
        provided through third-party services is at your own risk.
      </p>

      <h2>10. Map Data Disclaimer</h2>
      <p>
        Map data displayed within the App may include geographic information,
        bathymetric data, structures, terrain features, and other environmental
        or mapping details obtained from third-party sources.
      </p>
      <p>
        Such data may be outdated, incomplete, incorrectly rendered, or may not
        reflect current real-world conditions. Natural environments, especially
        bodies of water, can change over time due to sediment movement,
        seasonal variation, human activity, weather events, or other factors.
      </p>
      <p>
        Users should <strong>not rely solely on map data provided by the App</strong>{" "}
        for navigation, safety decisions, or fishing location assessment.
      </p>
      <p>
        All map data is provided on an{" "}
        <strong>&quot;as-is&quot; and &quot;as-available&quot; basis</strong>, and you assume full
        responsibility for verifying any information before relying on it.
      </p>

      <h2>11. Outdoor Activity Disclaimer</h2>
      <p>
        Fishing and other outdoor activities involve inherent risks. Catch Logs
        does not provide safety guidance, navigational guarantees, or
        environmental hazard warnings.
      </p>
      <p>By using the App, you acknowledge that:</p>
      <ul>
        <li>
          Fishing locations, depth information, and environmental conditions may
          change
        </li>
        <li>The App should not be relied upon as a navigational tool</li>
        <li>
          You are solely responsible for your safety and decisions while
          fishing or traveling
        </li>
      </ul>
      <p>
        Catch Logs is not responsible for injuries, accidents, property damage,
        or other losses that occur during outdoor activities.
      </p>

      <h2>12. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Catch Logs and its operators
        shall not be liable for any{" "}
        <strong>indirect, incidental, special, consequential, or punitive damages</strong>,
        including loss of data, loss of profits, or personal injury, arising
        from your use of or inability to use the App.
      </p>

      <h2>13. Termination</h2>
      <p>
        We reserve the right to suspend or terminate access to the App at any
        time, with or without notice, for violations of these Terms or misuse
        of the service.
      </p>

      <h2>14. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. If material changes are
        made, we may notify users via email or through the App.
      </p>
      <p>
        Continued use of the App after changes become effective constitutes
        acceptance of the revised Terms.
      </p>

      <h2>15. Governing Law</h2>
      <p>
        These Terms shall be governed and interpreted in accordance with the
        laws of the <strong>United States and the applicable state of the App&apos;s operator</strong>,
        without regard to conflict of law principles.
      </p>

      <h2>16. Contact</h2>
      <p>
        If you have questions regarding these Terms, you may contact us at:
      </p>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:arjohnson.dev@gmail.com">arjohnson.dev@gmail.com</a>
      </p>
    </MarkupPage>
  );
}
