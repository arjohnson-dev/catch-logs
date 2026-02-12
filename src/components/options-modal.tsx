import { FaArrowRightFromBracket, FaGear, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/domain";

interface OptionsModalProps {
  user: User;
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function OptionsModal({
  user,
  isOpen,
  isLoggingOut,
  onClose,
  onOpenSettings,
  onLogout,
}: OptionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
      <div className="dialog-panel options-modal-panel">
        <div className="dialog-header dialog-header-corner">
          <h2 className="dialog-title">Options</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label="Close options"
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>
        <div className="dialog-body options-modal-actions">
          <div className="settings-meta">
            {user.firstName} {user.lastName}
            <br />
            {user.email}
          </div>
          <Button
            variant="outline"
            className="btn-outline-muted btn-full options-modal-button"
            onClick={onOpenSettings}
          >
            <FaGear size={16} />
            Profile Settings
          </Button>
          <Button
            variant="outline"
            className="btn-outline-muted btn-full options-modal-button"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            <FaArrowRightFromBracket size={16} />
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}

