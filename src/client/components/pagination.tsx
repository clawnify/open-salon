import { ChevronLeft, ChevronRight } from "lucide-preact";
import { Button } from "@/components/ui/button";
import type { PaginatedState } from "../types";

interface Props {
  pag: PaginatedState;
  setPage: (page: number) => void;
}

export function Pagination({ pag, setPage }: Props) {
  const totalPages = Math.max(1, Math.ceil(pag.total / pag.limit));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button variant="outline" size="icon" className="h-8 w-8" disabled={pag.page <= 1} onClick={() => setPage(pag.page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">Page {pag.page} of {totalPages}</span>
      <Button variant="outline" size="icon" className="h-8 w-8" disabled={pag.page >= totalPages} onClick={() => setPage(pag.page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
