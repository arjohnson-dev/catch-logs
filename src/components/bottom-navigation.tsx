/*
 * File:        src/components/bottom-navigation.tsx
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
import {
  FaBookOpen,
  FaChartColumn,
  FaCloudSun,
  FaEllipsisVertical,
  FaMapLocationDot,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

type BottomNavSection = "map" | "journal" | "stats" | "weather" | "resources";

interface BottomNavigationProps {
  onMapClick: () => void;
  onJournalClick: () => void;
  activeSection: BottomNavSection | null;
}

export default function BottomNavigation({
  onMapClick,
  onJournalClick,
  activeSection,
}: BottomNavigationProps) {
  const getButtonClassName = (section: BottomNavSection) =>
    activeSection === section ? "touch-target btn-nav is-active" : "touch-target btn-nav";

  return (
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-grid">
        <Button
          variant="ghost"
          className={getButtonClassName("map")}
          onClick={onMapClick}
          aria-label="Map"
          title="Map"
          aria-current={activeSection === "map" ? "page" : undefined}
        >
          <FaMapLocationDot size={20} />
        </Button>

        <Button
          variant="ghost"
          className={getButtonClassName("journal")}
          onClick={onJournalClick}
          aria-label="Journal"
          title="Journal"
          aria-current={activeSection === "journal" ? "page" : undefined}
        >
          <FaBookOpen size={20} />
        </Button>

        <Link to="/stats">
          <Button
            variant="ghost"
            className={getButtonClassName("stats")}
            aria-label="Stats"
            title="Stats"
            aria-current={activeSection === "stats" ? "page" : undefined}
          >
            <FaChartColumn size={20} />
          </Button>
        </Link>

        <Link to="/weather">
          <Button
            variant="ghost"
            className={getButtonClassName("weather")}
            aria-label="Weather"
            title="Weather"
            aria-current={activeSection === "weather" ? "page" : undefined}
          >
            <FaCloudSun size={20} />
          </Button>
        </Link>

        <Link to="/resources">
          <Button
            variant="ghost"
            className={getButtonClassName("resources")}
            aria-label="Resources"
            title="Resources"
            aria-current={activeSection === "resources" ? "page" : undefined}
          >
            <FaEllipsisVertical size={20} />
          </Button>
        </Link>
      </div>
    </nav>
  );
}
