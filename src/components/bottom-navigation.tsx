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
import { FaBookOpen, FaChartColumn } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface BottomNavigationProps {
  onJournalClick: () => void;
}

export default function BottomNavigation({ 
  onJournalClick
}: BottomNavigationProps) {
  return (
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-grid">
        <Button
          variant="ghost"
          className="touch-target btn-nav"
          onClick={onJournalClick}
        >
          <FaBookOpen size={20} />
          <span className="btn-nav-label">Journal</span>
        </Button>

        <Link to="/stats">
          <Button
            variant="ghost"
            className="touch-target btn-nav"
          >
            <FaChartColumn size={20} />
            <span className="btn-nav-label">Stats</span>
          </Button>
        </Link>
      </div>
    </nav>
  );
}
