import { useCallback, useEffect, useRef, useState } from "react";

export function useCameraCapture(input: {
  onCapture: (capture: { file: File; previewUrl: string }) => void;
  onError: (message: string) => void;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCaptureRef = useRef(input.onCapture);
  const onErrorRef = useRef(input.onError);

  useEffect(() => {
    onCaptureRef.current = input.onCapture;
    onErrorRef.current = input.onError;
  }, [input.onCapture, input.onError]);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setShowCamera(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: 640,
          height: 480,
        },
      });

      streamRef.current = stream;
      setShowCamera(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown camera error";
      onErrorRef.current(`Unable to access camera: ${message}`);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      onErrorRef.current("Camera not ready. Please wait for video to load.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    if (!context || video.videoWidth <= 0) {
      onErrorRef.current("Camera not ready. Please wait for video to load.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onErrorRef.current("Could not capture a photo from the camera.");
          return;
        }

        onCaptureRef.current({
          file: new File([blob], "camera-photo.jpg", { type: "image/jpeg" }),
          previewUrl: canvas.toDataURL("image/jpeg", 0.7),
        });
        closeCamera();
      },
      "image/jpeg",
      0.7,
    );
  }, [closeCamera]);

  useEffect(() => {
    if (!showCamera || !streamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.setAttribute("playsinline", "true");
    video.setAttribute("autoplay", "true");
    video.setAttribute("muted", "true");

    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        onErrorRef.current("Camera preview could not start. Please try again.");
      }
    };

    if (video.readyState >= 2) {
      void playVideo();
      return;
    }

    video.addEventListener("loadeddata", playVideo, { once: true });
    return () => {
      video.removeEventListener("loadeddata", playVideo);
    };
  }, [showCamera]);

  useEffect(() => {
    return () => {
      closeCamera();
    };
  }, [closeCamera]);

  return {
    showCamera,
    videoRef,
    canvasRef,
    startCamera,
    capturePhoto,
    closeCamera,
  };
}
