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

interface BottomNavigationProps {
  onMapClick: () => void;
  onJournalClick: () => void;
}

export default function BottomNavigation({
  onMapClick,
  onJournalClick,
}: BottomNavigationProps) {
  return (
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-grid">
        <Link to="/stats">
          <Button
            variant="ghost"
            className="touch-target btn-nav"
            aria-label="Stats"
            title="Stats"
          >
            <FaChartColumn size={20} />
          </Button>
        </Link>

        <Button
          variant="ghost"
          className="touch-target btn-nav"
          onClick={onJournalClick}
          aria-label="Journal"
          title="Journal"
        >
          <FaBookOpen size={20} />
        </Button>

        <Button
          variant="ghost"
          className="touch-target btn-nav btn-nav-map"
          onClick={onMapClick}
          aria-label="Map"
          title="Map"
        >
          <FaMapLocationDot size={26} />
        </Button>

        <Link to="/weather">
          <Button
            variant="ghost"
            className="touch-target btn-nav btn-nav-weather"
            aria-label="Weather"
            title="Weather"
          >
            <FaCloudSun size={20} />
          </Button>
        </Link>

        <Link to="/resources">
          <Button
            variant="ghost"
            className="touch-target btn-nav btn-nav-resources"
            aria-label="Resources"
            title="Resources"
          >
            <FaEllipsisVertical size={20} />
          </Button>
        </Link>
      </div>
    </nav>
  );
}
