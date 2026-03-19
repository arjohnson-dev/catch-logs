import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FeatureBetaBannerProps {
  featureName: string;
  className?: string;
}

export default function FeatureBetaBanner({
  featureName,
  className,
}: FeatureBetaBannerProps) {
  return (
    <Card className={cn("feature-beta-banner surface-card", className)}>
      <CardContent className="pt-6">
        <p className="feature-beta-banner-copy">
          {featureName} is currently in beta. Feedback and improvement ideas are
          encouraged via the{" "}
          <Link to="/support" className="text-link">
            Contact Support page
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
