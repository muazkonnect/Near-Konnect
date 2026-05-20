import { useState, useRef } from "react";
import { Upload, X, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ProofUploader = ({ value, onChange, disabled }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handle = (f: File | null) => {
    onChange(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] || null)}
        disabled={disabled}
      />
      {value && preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-hero-foreground/10">
          <img src={preview} alt="Payment proof" className="w-full max-h-64 object-contain bg-hero-foreground/5" />
          <button
            type="button"
            onClick={() => handle(null)}
            className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-black/50 px-3 py-1.5 text-xs text-white">
            <FileImage className="h-3.5 w-3.5" /> {value.name}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-hero-foreground/20 bg-hero-foreground/[0.03] px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
        >
          <Upload className="h-6 w-6 text-hero-foreground/50" />
          <p className="text-sm font-semibold">Upload payment screenshot</p>
          <p className="text-xs text-hero-foreground/50">PNG / JPG, up to 5 MB</p>
        </button>
      )}
    </div>
  );
};

export default ProofUploader;
