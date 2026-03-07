/*
 * File:        src/pages/not-found.tsx
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
