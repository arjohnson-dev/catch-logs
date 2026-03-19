import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface FieldGuideStatusCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function FieldGuideStatusCard({
  icon,
  title,
  description,
}: FieldGuideStatusCardProps) {
  return (
    <Card className="resources-card surface-card">
      <CardContent className="resources-empty-state">
        {icon}
        <div>
          <h2 className="resources-empty-title">{title}</h2>
          <p className="resources-empty-copy">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
