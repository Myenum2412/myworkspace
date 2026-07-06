import { Loader2 } from "lucide-react";

export default function StaffsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
