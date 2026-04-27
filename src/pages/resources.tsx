import { useLocation } from "wouter";
import {
  FaBookOpen,
  FaChevronRight,
  FaFishFins,
  FaScaleBalanced,
  FaWaveSquare,
} from "react-icons/fa6";
import FeatureBetaBanner from "@/components/feature-beta-banner";

const RESOURCE_ITEMS = [
  {
    title: "Trusted Sources",
    description: "Review the approved external sources used across CatchLogs.",
    icon: FaBookOpen,
    to: "/resources/trusted-sources",
    isAvailable: true,
  },
  {
    title: "Field Guide",
    description: "Browse species and learn more about fish.",
    icon: FaFishFins,
    to: "/resources/field-guide",
    isAvailable: true,
  },
  {
    title: "Fishing Reports",
    description: "Check current local fishing activity and conditions.",
    icon: FaWaveSquare,
    to: "/resources/fishing-reports",
    isAvailable: false,
  },
  {
    title: "Regulations",
    description: "Access fishing rules and regulatory information.",
    icon: FaScaleBalanced,
    to: "/resources/regulations",
    isAvailable: false,
  },
] as const;

export default function Resources() {
  const [, navigate] = useLocation();

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <h1 className="page-title">Resources</h1>
        </div>

        <div className="resources-stack">
          <FeatureBetaBanner featureName="Resources" />

          <div className="resources-hub-grid">
            {RESOURCE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  className={
                    item.isAvailable
                      ? "resources-hub-card surface-card surface-card-hover"
                      : "resources-hub-card resources-hub-card-disabled surface-card"
                  }
                  onClick={item.isAvailable ? () => navigate(item.to) : undefined}
                  disabled={!item.isAvailable}
                  aria-disabled={!item.isAvailable}
                >
                  <div className="resources-hub-icon">
                    <Icon size={22} />
                  </div>
                  <div className="resources-hub-copy">
                    <h2 className="resources-hub-title">{item.title}</h2>
                    <p className="resources-hub-description">{item.description}</p>
                    {!item.isAvailable && (
                      <p className="resources-hub-status">Coming Soon!</p>
                    )}
                  </div>
                  {item.isAvailable ? (
                    <FaChevronRight className="resources-hub-chevron" size={16} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
