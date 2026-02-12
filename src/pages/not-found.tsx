import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaArrowLeft, FaHouse } from "react-icons/fa6";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="center-card-shell">
      <Card className="center-card">
        <CardHeader className="center-card-header">
          <CardTitle className="text-2xl">404 - Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="center-card-content space-y-4">
          <p className="text-muted">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')}
              className="btn-full btn-primary"
            >
              <FaHouse className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
            <Button 
              variant="ghost"
              onClick={() => window.history.back()}
              className="btn-full btn-ghost-muted"
            >
              <FaArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
