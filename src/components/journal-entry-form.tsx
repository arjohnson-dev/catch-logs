import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaArrowLeft, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadCatchPhoto } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { createEntry, getEntries, getPinById } from "@/lib/supabase-data";
import { getWeatherForLocationAndTime } from "@/lib/weather";

const entrySchema = z.object({
  fishType: z.string().min(1, "Fish type is required"),
  length: z.number().positive("Length must be greater than 0").optional(),
  weight: z.number().positive("Weight must be greater than 0").optional(),
  tackle: z.string().optional(),
  notes: z.string().optional(),
  dateTime: z.string().min(1, "Date and time are required"),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface JournalEntryFormProps {
  pinId: number;
  defaultTackle?: string;
  onClose: () => void;
  onComplete: () => void;
  fullScreen?: boolean;
}


export default function JournalEntryForm({ pinId, defaultTackle = "", onClose, onComplete, fullScreen = false }: JournalEntryFormProps) {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: getEntries,
  });

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      fishType: "",
      length: undefined,
      weight: undefined,
      tackle: defaultTackle,
      notes: "",
      dateTime: (() => {
        const now = new Date();
        // Adjust for timezone offset to get local time
        const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        return localTime.toISOString().slice(0, 16);
      })(),
    },
  });

  useEffect(() => {
    form.setValue("tackle", defaultTackle);
  }, [defaultTackle, form]);

  const fishTypeInput = useWatch({
    control: form.control,
    name: "fishType",
  });
  const fishTypeSuggestions = Array.from(
    new Set(
      entries
        .map((entry) => entry.fishType?.trim())
        .filter((fishType): fishType is string => Boolean(fishType && fishType.length > 0)),
    ),
  )
    .filter((fishType) => fishType.toLowerCase().includes((fishTypeInput || "").toLowerCase()))
    .slice(0, 8);

  const createEntryMutation = useMutation({
    mutationFn: async (data: EntryFormData) => {
      if (!user?.id) {
        throw new Error("You must be logged in to save an entry.");
      }

      const chosenTackle = (data.tackle || "").trim();
      if (!chosenTackle) {
        throw new Error("Please enter a tackle value before saving this entry.");
      }

      const pin = await getPinById(pinId);
      if (!pin) {
        throw new Error("Pin no longer exists. Please drop a new pin.");
      }

      let photoUrl: string | null = null;

      if (selectedPhoto) {
        photoUrl = await uploadCatchPhoto(selectedPhoto, user.id);
      }

      const weather = await getWeatherForLocationAndTime(
        pin.latitude,
        pin.longitude,
        data.dateTime,
      );

      return createEntry({
        pinId,
        userId: user.id,
        fishType: data.fishType,
        length: data.length,
        weight: data.weight,
        tackle: chosenTackle,
        notes: data.notes,
        photoUrl,
        dateTime: data.dateTime,
        temperature: weather?.temperature ?? null,
        windSpeed: weather?.windSpeed ?? null,
        windDirection: weather?.windDirection ?? null,
        cloudCoverage: weather?.cloudCoverage ?? null,
        visibility: weather?.visibility ?? null,
        weatherCondition: weather?.weatherCondition ?? null,
        weatherDescription: weather?.weatherDescription ?? null,
      });
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      if (!entry.weatherCondition && !entry.temperature && !entry.windSpeed) {
        toast({
          title: "Saved without weather",
          description: "Could not fetch weather right now, but your catch was saved.",
        });
      }
      onComplete();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save entry";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleCameraClick = async () => {
    try {
      console.log('Requesting camera access...');
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: 640,
          height: 480
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream.getVideoTracks()[0].getSettings());
      
      streamRef.current = stream;
      setShowCamera(true);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown camera error";
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: `Unable to access camera: ${message}`,
        variant: "destructive",
      });
    }
  };

  // Handle video setup when camera state changes
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      console.log('Setting up video element...');
      const video = videoRef.current;
      
      video.srcObject = streamRef.current;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      
      const playVideo = async () => {
        try {
          await video.play();
          console.log('Video started playing');
        } catch (error) {
          console.error('Play failed:', error);
        }
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.addEventListener('loadeddata', playVideo, { once: true });
      }
    }
  }, [showCamera]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      console.log('Capturing photo, video dimensions:', video.videoWidth, video.videoHeight);
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (context && video.videoWidth > 0) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setSelectedPhoto(file);
            setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
            closeCamera();
            console.log('Photo captured successfully');
          }
        }, 'image/jpeg', 0.7);
      } else {
        console.error('Cannot capture: video not ready');
        toast({
          title: "Capture Error",
          description: "Camera not ready. Please wait for video to load.",
          variant: "destructive",
        });
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };



  const onSubmit = (data: EntryFormData) => {
    createEntryMutation.mutate(data);
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={fullScreen ? "entry-page-form" : "dialog-body space-y-6"}>
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Fish Photo</label>
              <div className="text-center">
                {showCamera ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border border-[#333333]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        width="100%"
                        height="300"
                        className="block w-full h-[300px] video-preview"
                        onLoadedData={() => console.log('Video data loaded')}
                        onPlaying={() => console.log('Video is playing')}
                        onError={(e) => console.error('Video error:', e)}
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        className="btn-primary"
                      >
                        Capture
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeCamera}
                        className="btn-outline-muted btn-outline-muted-accent"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : photoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={photoPreview}
                      alt="Selected fish"
                      className="w-32 h-32 object-cover rounded-lg mx-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null);
                        setSelectedPhoto(null);
                      }}
                      className="btn-outline-muted btn-outline-muted-accent"
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCameraClick}
                      className="btn-outline-muted btn-outline-muted-accent"
                    >
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUploadClick}
                      className="btn-outline-muted btn-outline-muted-accent"
                    >
                      Upload
                    </Button>
                  </div>
                )}
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Fish Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fishType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Fish Type</FormLabel>
                    <FormControl>
                      <Input 
                        list="fish-type-suggestions"
                        placeholder="Bass" 
                        className="field-dark"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <datalist id="fish-type-suggestions">
                      {fishTypeSuggestions.map((suggestion) => (
                        <option key={suggestion} value={suggestion} />
                      ))}
                    </datalist>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tackle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tackle</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Wacky rig, spinnerbait, jerkbait..."
                      className="field-dark"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Length (inches)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="18.5"
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="2.3"
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Time */}
            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Date and Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      className="field-dark"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Describe the catch, location details, fighting behavior..."
                      className="resize-none field-dark"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 touch-target btn-outline-muted"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 touch-target btn-primary"
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? "Saving..." : "Save Catch"}
              </Button>
            </div>
      </form>
    </Form>
  );

  if (fullScreen) {
    return (
      <div className="page-scroll">
        <div className="page-content entry-page-content">
          <div className="page-header">
            <Button variant="ghost" size="sm" className="legal-back-button" onClick={onClose}>
              <FaArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="page-title">New Catch Entry</h1>
          </div>
          {formBody}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-sheet">
      <div className="dialog-panel dialog-panel-sheet">
        <div className="dialog-header dialog-header-sticky dialog-header-corner">
          <h2 className="dialog-title">New Catch Entry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label="Close new catch entry"
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>
        {formBody}
      </div>
    </div>
  );
}
