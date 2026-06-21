"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mirrors CostRange in lib/cost-reporting.ts. "now" is the canonical default and
// is represented by the absence of the URL param.
const RANGE_OPTIONS = [
  { value: "now", label: "Now (snapshot)" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
] as const;

type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

function normalizeRange(value: string | null): RangeValue {
  return RANGE_OPTIONS.some((option) => option.value === value)
    ? (value as RangeValue)
    : "now";
}

export function TimeRangeSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selected = normalizeRange(searchParams.get("range"));
  const selectedLabel =
    RANGE_OPTIONS.find((option) => option.value === selected)?.label ??
    "Now (snapshot)";

  function updateRange(next: string) {
    const params = new URLSearchParams(searchParams.toString());

    // "now" is the default — drop the param to keep URLs canonical.
    if (next === "now") {
      params.delete("range");
    } else {
      params.set("range", next);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" size="sm" type="button" variant="outline">
          <CalendarRange className="h-4 w-4 shrink-0" />
          <span>{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuRadioGroup value={selected} onValueChange={updateRange}>
          {RANGE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
