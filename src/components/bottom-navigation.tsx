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
