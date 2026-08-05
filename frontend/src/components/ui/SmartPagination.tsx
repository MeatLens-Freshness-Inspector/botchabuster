import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SmartPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  siblingCount?: number;
  className?: string;
}

export function SmartPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  siblingCount = 1,
  className = "",
}: SmartPaginationProps) {
  if (totalPages <= 1 && totalItems === undefined) return null;

  const getPageNumbers = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    const totalNumbers = siblingCount * 2 + 5;
    if (totalPages <= totalNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftEllipsis = leftSiblingIndex > 2;
    const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "ellipsis-end", totalPages];
    }

    if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, "ellipsis-start", ...rightRange];
    }

    if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, "ellipsis-start", ...middleRange, "ellipsis-end", totalPages];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  const pages = getPageNumbers();

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}>
      {totalItems !== undefined && startItem !== null && endItem !== null ? (
        <p className="text-muted-foreground font-medium">
          Showing <span className="font-semibold text-foreground">{totalItems > 0 ? startItem : 0}</span>-
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{totalItems}</span>
        </p>
      ) : (
        <p className="text-muted-foreground">
          Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
          <span className="font-medium text-foreground">{totalPages}</span>
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex max-w-full items-center gap-1 overflow-x-auto py-0.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
            title="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="sr-only">First page</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
            title="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Previous page</span>
          </Button>

          <div className="flex items-center gap-1 shrink-0">
            {pages.map((page, idx) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span
                    key={`${page}-${idx}`}
                    className="flex h-8 w-6 items-center justify-center text-muted-foreground text-xs select-none"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </span>
                );
              }

              const isCurrent = page === currentPage;

              return (
                <Button
                  key={page}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs transition-all ${
                    isCurrent ? "font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
            title="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Next page</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 rounded-lg shrink-0"
            title="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      )}
    </div>
  );
}
