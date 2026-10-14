import { useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image } from "lucide-react";

interface FileUploadProps {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  helpText?: string;
  type?: "image" | "document";
}

const FileUpload = ({
  label,
  accept,
  file,
  onChange,
  helpText,
  type = "document",
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (file && type === "image") return URL.createObjectURL(file);
    return null;
  }, [file, type]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  const handleRemove = () => {
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // IMPORTANT: ensures UI resets when parent clears file
  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [file]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {!file ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="w-full h-20 border-dashed flex flex-col gap-1"
        >
          <Upload className="w-5 h-5" />
          <span className="text-sm">Click to upload</span>
        </Button>
      ) : (
        <div className="border rounded-lg p-3 flex items-center gap-3 bg-muted/30">
          {preview ? (
            <img
              src={preview}
              className="w-12 h-12 rounded object-cover"
            />
          ) : (
            <div className="w-12 h-12 flex items-center justify-center">
              {type === "image" ? <Image /> : <FileText />}
            </div>
          )}

          <div className="flex-1">
            <p className="text-sm truncate">{file.name}</p>
          </div>

          <button type="button" onClick={handleRemove}>
            <X />
          </button>
        </div>
      )}

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};

export default FileUpload;