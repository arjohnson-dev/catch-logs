import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { uploadCatchPhoto } from "@/lib/storage";
import { replaceEntryPhoto, updateEntry } from "@/lib/supabase-data";
import { type JournalEntry } from "@/types/domain";
import { useAuth } from "@/hooks/useAuth";

const editSchema = z.object({
  fishType: z.string().min(1, "Fish type is required"),
  length: z.number().positive("Length must be greater than 0").optional(),
  weight: z.number().positive("Weight must be greater than 0").optional(),
  tackle: z.string().min(1, "Tackle is required"),
  notes: z.string().optional(),
  dateTime: z.string().min(1, "Date and time are required"),
});

type EditFormData = z.infer<typeof editSchema>;

interface JournalEntryEditorProps {
  entry: JournalEntry;
  onClose: () => void;
  onComplete: () => void;
}

export default function JournalEntryEditor({ entry, onClose, onComplete }: JournalEntryEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(entry.photoUrl ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fishType: entry.fishType,
      length: entry.length ?? undefined,
      weight: entry.weight ?? undefined,
      tackle: entry.tackle ?? "",
      notes: entry.notes ?? "",
      dateTime: (() => {
        const date = new Date(entry.dateTime);
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      })(),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!user?.id) {
        throw new Error("You must be logged in to edit entries.");
      }

      let nextPhotoUrl: string | null = entry.photoUrl ?? null;
      if (selectedPhoto) {
        nextPhotoUrl = await uploadCatchPhoto(selectedPhoto, user.id);
      } else if (removePhoto) {
        nextPhotoUrl = null;
      }

      await updateEntry({
        entryId: entry.id,
        fishType: data.fishType,
        length: data.length ?? null,
        weight: data.weight ?? null,
        tackle: data.tackle,
        notes: data.notes ?? null,
        photoUrl: nextPhotoUrl,
        dateTime: data.dateTime,
      });

      await replaceEntryPhoto({
        entryId: entry.id,
        nextPhotoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      toast({
        title: "Entry updated",
        description: "Your journal entry has been updated.",
      });
      onComplete();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to update entry";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditFormData) => {
    mutation.mutate(data);
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedPhoto(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-sheet">
      <div className="dialog-panel dialog-panel-sheet">
        <div className="dialog-header dialog-header-sticky dialog-header-corner">
          <h2 className="dialog-title">Edit Entry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label="Close edit entry"
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="dialog-body space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Fish Photo</label>
              <div className="text-center space-y-3">
                {photoPreview ? (
                  <img src={photoPreview} alt="Entry fish" className="w-32 h-32 object-cover rounded-lg mx-auto" />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-[#222222] mx-auto" />
                )}
                <div className="flex gap-2 justify-center">
                  <Button type="button" variant="outline" className="btn-outline-muted" onClick={() => uploadInputRef.current?.click()}>
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="btn-outline-muted"
                    onClick={() => {
                      setPhotoPreview(null);
                      setSelectedPhoto(null);
                      setRemovePhoto(true);
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <input ref={uploadInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="fishType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Fish Type</FormLabel>
                  <FormControl>
                    <Input className="field-dark" {...field} />
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
                    <FormLabel className="text-white">Length</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
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
                    <FormLabel className="text-white">Weight</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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

            <FormField
              control={form.control}
              name="tackle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Tackle</FormLabel>
                  <FormControl>
                    <Input className="field-dark" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Date and Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" className="field-dark" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Notes</FormLabel>
                  <FormControl>
                    <Textarea className="field-dark" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="btn-outline-muted flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
