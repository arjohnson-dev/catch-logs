import { Link } from "wouter";
import { FaArrowLeft, FaScrewdriverWrench } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ResourcesPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Link to="/resources">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">{title}</h1>
        </div>

        <div className="resources-stack">
          <Card className="resources-card resources-hero-card surface-card">
            <CardContent className="resources-hero-content">
              <div className="resources-hero-icon">
                <FaScrewdriverWrench size={28} />
              </div>
              <div>
                <p className="resources-eyebrow">Resources</p>
                <h2 className="resources-hero-title">{title}</h2>
                <p className="resources-hero-copy">{description}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="resources-card surface-card">
            <CardContent className="resources-empty-state">
              <FaScrewdriverWrench size={20} />
              <div>
                <h2 className="resources-empty-title">Coming soon</h2>
                <p className="resources-empty-copy">
                  This resource now has a dedicated place in the app and will grow from the Resources hub.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
