import { type ReactNode, useRef } from "react";
import { FaArrowLeft, FaDownload } from "react-icons/fa6";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface MarkupPageProps {
  title: string;
  downloadFileName: string;
  children: ReactNode;
}

export default function MarkupPage({
  title,
  downloadFileName,
  children,
}: MarkupPageProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const text = contentRef.current?.innerText?.trim();
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-scroll">
      <div className="page-content page-content-prose">
        <div className="page-header">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">{title}</h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="btn-outline-muted ml-auto"
            onClick={handleDownload}
          >
            <FaDownload className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>

        <div ref={contentRef} className="terms-privacy-prose">
          {children}
        </div>
      </div>
    </div>
  );
}
