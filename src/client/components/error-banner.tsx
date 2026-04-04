import { useApp } from "../context";
import { X } from "lucide-preact";
import { Button } from "@/components/ui/button";

export function ErrorBanner() {
  const { error, setError } = useApp();
  if (!error) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg">
      <span>{error}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setError(null)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
