/*
 * File:        src/pages/landing.tsx
 * Description: Public landing page for CatchLogs.
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
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CloudSun,
  LogIn,
  MapPin,
  NotebookTabs,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from "lucide-react";
import catchLogsIcon from "@assets/catchlogs-icon.png";
import lpFieldGuide from "@assets/lp_fieldguide.png";
import lpJournal from "@assets/lp_journal.png";
import lpMap from "@assets/lp_map.png";
import lpStats from "@assets/lp_stats.png";

const features = [
  {
    title: "Catch map",
    copy: "Drop pins, group entries by spot, and return to the details that matter before your next trip.",
    Icon: MapPin,
  },
  {
    title: "Detailed journal",
    copy: "Save species, size, weight, lure, bait, notes, photos, and conditions in one organized log.",
    Icon: NotebookTabs,
  },
  {
    title: "Fishing patterns",
    copy: "Review species totals, monthly activity, top locations, and condition trends from your own entries.",
    Icon: BarChart3,
  },
  {
    title: "Weather",
    copy: "Barometric pressure, lunar phase, and official forecast details shaped around what anglers need.",
    Icon: CloudSun,
  },
  {
    title: "Field guide",
    copy: "Search species information and keep useful references near the logbook you already use.",
    Icon: BookOpen,
  },
  {
    title: "Privacy",
    copy: "Your entries stay with your account and are not shared across the CatchLogs platform.",
    Icon: ShieldCheck,
  },
];

const workflow = [
  "Drop a pin",
  "Record your catch",
  "Review what worked",
];

const screenshots = [
  {
    title: "Journal",
    image: lpJournal,
    alt: "CatchLogs journal screen showing logged catches.",
  },
  {
    title: "Stats",
    image: lpStats,
    alt: "CatchLogs stats screen showing fishing activity charts.",
  },
  {
    title: "Field guide",
    image: lpFieldGuide,
    alt: "CatchLogs field guide screen showing species reference details.",
  },
];

function AppScreenshot({
  image,
  alt,
  variant = "standard",
}: {
  title?: string;
  image: string;
  alt: string;
  variant?: "hero" | "standard";
}) {
  return (
    <figure className={`landing-shot landing-shot-${variant}`}>
      <img src={image} alt={alt} width={610} height={965} />
    </figure>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span>CatchLogs LLC</span>
      <Link to="/terms">Terms</Link>
      <Link to="/privacy">Privacy</Link>
      <Link to="/support">Support</Link>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page page-scroll">
      <header className="landing-nav" aria-label="CatchLogs">
        <Link to="/" className="landing-brand">
          <span className="landing-brand-icon">
            <img src={catchLogsIcon} alt="" width={32} height={32} />
          </span>
          <span>CatchLogs</span>
        </Link>
        <nav className="landing-nav-actions" aria-label="Account">
          <Link to="/login" className="landing-nav-link">
            Login
          </Link>
          <Link to="/register" className="landing-nav-button">
            Register
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Your digital fishing journal</p>
          <h1>CatchLogs</h1>
          <p className="landing-hero-lede">
            Get the most out of every outing by turning each catch into a useful
            record of spots, conditions, notes, and patterns.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="landing-button landing-button-primary">
              <UserPlus size={18} />
              Register
            </Link>
            <Link to="/login" className="landing-button landing-button-secondary">
              <LogIn size={18} />
              Login
            </Link>
          </div>
          <p className="landing-hero-note">
            Works in the browser and can be saved to your iOS or Android home
            screen. No download required.
          </p>
        </div>
        <div className="landing-hero-art">
          <AppScreenshot
            image={lpMap}
            alt="CatchLogs map screen showing catch pins and map controls."
            variant="hero"
          />
        </div>
      </section>

      <section className="landing-section landing-screens-section" aria-labelledby="screenshots-title">
        <div className="landing-section-heading">
          <h2 id="screenshots-title">A better way for anglers to log every trip.</h2>
          <p>
            CatchLogs keeps your spots, catches, conditions, and notes connected
            so each entry becomes easier to review and learn from.
          </p>
        </div>
        <div className="landing-screenshot-grid">
          {screenshots.map((screenshot) => (
            <AppScreenshot key={screenshot.title} {...screenshot} />
          ))}
        </div>
      </section>

      <section className="landing-section landing-feature-section" aria-labelledby="features-title">
        <div className="landing-section-heading">
          <h2 id="features-title">A logbook with maps, conditions, and reference tools in one place.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ title, copy, Icon }) => (
            <article className="landing-feature-card" key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <h2 id="flow-title">Get more from every outing in 3 easy steps.</h2>
        </div>
        <ol className="landing-flow-list">
          {workflow.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-install-section" aria-labelledby="install-title">
        <div className="landing-install-copy">
          <h2 id="install-title">CatchLogs goes with you from dock to desk.</h2>
          <p>
            Open CatchLogs on your phone when you are near the water, then review
            maps, notes, photos, and patterns later from a tablet or desktop.
            Your account keeps the same fishing journal available wherever you
            sign in.
          </p>
        </div>
        <div className="landing-install-points">
          <div>
            <Smartphone size={22} />
            <strong>Mobile when it matters</strong>
            <span>Save catches in the field from iOS or Android browsers.</span>
          </div>
          <div>
            <CheckCircle2 size={22} />
            <strong>Desktop when you want space</strong>
            <span>Use the larger screen to review entries, stats, and trip patterns.</span>
          </div>
        </div>
      </section>

      <section className="landing-final-cta" aria-label="Get started">
        <h2>Ready to build a better fishing memory?</h2>
        <div className="landing-hero-actions">
          <Link to="/register" className="landing-button landing-button-primary">
            <UserPlus size={18} />
            Get started
          </Link>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
