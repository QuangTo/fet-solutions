"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({ onPageChange, page, pageCount }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-ui-sm font-semibold text-slate-500">
      <Button
        disabled={page === 1}
        onClick={() => onPageChange(1)}
        size="icon"
        title="Trang đầu"
        type="button"
        variant="secondary"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        size="icon"
        title="Trang trước"
        type="button"
        variant="secondary"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span>
        Trang {page} / {pageCount}
      </span>
      <Button
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        size="icon"
        title="Trang sau"
        type="button"
        variant="secondary"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        disabled={page === pageCount}
        onClick={() => onPageChange(pageCount)}
        size="icon"
        title="Trang cuối"
        type="button"
        variant="secondary"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
