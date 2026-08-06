import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { uploadImage } from "@/services/upload.service";

interface PhotoUploadProps {
  value: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  hint?: string;
}

/**
 * Cloudinary-backed photo upload. Selected images are posted to the backend
 * upload API and the returned secure URLs are stored in `value`.
 */
export function PhotoUpload({
  value,
  onChange,
  label = "Photos",
  hint = "Uploads to Cloudinary",
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      const next = [...value];
      const list = Array.from(files);
      let uploaded = 0;
      for (const file of list) {
        try {
          const url = await uploadImage(file);
          next.push(url);
          uploaded += 1;
        } catch {
          toast.error(`Couldn't upload ${file.name}`);
        }
      }
      onChange(next.slice(0, 6));
      setUploading(false);
      if (uploaded > 0) {
        toast.success(uploaded === 1 ? "Photo uploaded" : `${uploaded} photos uploaded`);
      }
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <UploadCloud className="size-3" /> {hint}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
        {value.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/40"
          >
            <img src={src} alt={`Upload ${index + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-foreground/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              aria-label={`Remove photo ${index + 1}`}
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {uploading ? (
          <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-border/70 bg-muted/40 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-[10px] font-medium">Uploading…</span>
          </div>
        ) : null}
        {value.length + (uploading ? 1 : 0) < 6 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-orange-50/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <ImagePlus className="size-4" />
            <span className="text-[10px] font-medium">Add</span>
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
