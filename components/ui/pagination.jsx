import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button";

function Pagination({
  className,
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
}) {
  const totalPages = React.useMemo(() => {
    const tp = Math.max(1, Math.ceil((Number(totalItems) || 0) / (Number(pageSize) || 1)));
    return tp;
  }, [pageSize, totalItems]);

  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const go = (p) => (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!onPageChange) return;
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== current) onPageChange(next);
  };

  // Build a compact range of page numbers around current
  const numbers = React.useMemo(() => {
    const range = [];
    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i++) range.push(i);
    return { start, end, range };
  }, [current, totalPages]);

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={go(current - 1)} aria-disabled={current <= 1} />
        </PaginationItem>
        {numbers.start > 1 && (
          <>
            <PaginationItem>
              <PaginationLink href="#" onClick={go(1)} isActive={current === 1}>1</PaginationLink>
            </PaginationItem>
            {numbers.start > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}
        {numbers.range.map((n) => (
          <PaginationItem key={n}>
            <PaginationLink href="#" onClick={go(n)} isActive={n === current}>{n}</PaginationLink>
          </PaginationItem>
        ))}
        {numbers.end < totalPages && (
          <>
            {numbers.end < totalPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink href="#" onClick={go(totalPages)} isActive={current === totalPages}>{totalPages}</PaginationLink>
            </PaginationItem>
          </>
        )}
        <PaginationItem>
          <PaginationNext href="#" onClick={go(current + 1)} aria-disabled={current >= totalPages} />
        </PaginationItem>
      </PaginationContent>
    </nav>
  );
}

function PaginationContent({
  className,
  ...props
}) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props} />
  );
}

function PaginationItem({
  ...props
}) {
  return <li data-slot="pagination-item" {...props} />;
}

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }), className)}
      {...props} />
  );
}

function PaginationPrevious({
  className,
  ...props
}) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}>
      <ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  ...props
}) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}>
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}>
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
