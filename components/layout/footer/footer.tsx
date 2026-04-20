import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="border-t bg-transparent px-4 py-3 text-sm">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 text-center">
        <p className="text-black dark:text-white">
          &copy; {new Date().getFullYear()} Spendemon. All rights reserved.
        </p>

        <Button asChild className="shadow-sm text-black dark:text-white" size="sm" variant="outline">
          <Link
            href="https://spendemon.com/docs/intro"
            rel="noreferrer"
            target="_blank"
          >
            Docs
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </footer>
  );
}
