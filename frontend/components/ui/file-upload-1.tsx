"use client";

import { FileUpload } from "@ark-ui/react/file-upload";
import { Upload } from "lucide-react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
};

export function BannerUpload({ onFile, disabled }: Props) {
  return (
    <FileUpload.Root
      maxFiles={1}
      accept="image/*"
      className="flex flex-col items-start gap-3"
      onFileChange={(details) => {
        const file = details.acceptedFiles?.[0];
        if (file) onFile(file);
      }}
      disabled={disabled}
    >
      <FileUpload.Context>
        {({ acceptedFiles }) => (
          <>
            <div className="flex items-center gap-3 w-full">
              <div className="grid size-10 shrink-0 place-content-center rounded border bg-muted overflow-hidden">
                {acceptedFiles.length > 0 ? (
                  <FileUpload.ItemGroup>
                    <FileUpload.Item file={acceptedFiles[0]}>
                      <FileUpload.ItemPreview type="image/*">
                        <FileUpload.ItemPreviewImage className="size-full object-cover" />
                      </FileUpload.ItemPreview>
                    </FileUpload.Item>
                  </FileUpload.ItemGroup>
                ) : (
                  <Upload className="size-5 text-muted-foreground" />
                )}
              </div>

              <FileUpload.Trigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">
                <Upload className="mr-1.5 size-3.5" />
                {acceptedFiles.length > 0 ? "Change image" : "Upload image"}
              </FileUpload.Trigger>
            </div>

            {acceptedFiles.length > 0 && (
              <FileUpload.ItemGroup>
                <FileUpload.Item
                  file={acceptedFiles[0]}
                  className="flex items-center gap-2 w-full"
                >
                  <FileUpload.ItemName className="text-sm text-muted-foreground truncate max-w-[200px]" />
                  <FileUpload.ItemDeleteTrigger className="text-sm text-destructive hover:text-destructive/80 ml-auto shrink-0">
                    Remove
                  </FileUpload.ItemDeleteTrigger>
                </FileUpload.Item>
              </FileUpload.ItemGroup>
            )}
          </>
        )}
      </FileUpload.Context>

      <FileUpload.HiddenInput />
    </FileUpload.Root>
  );
}
