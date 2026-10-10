import Link from "next/link";
import { Briefcase } from "lucide-react";

import { cn } from "@/lib/utils";

export function Wordmark({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight text-foreground",
        className
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Briefcase className="h-3.5 w-3.5" />
      </span>
      CrushBoard
    </Link>
  );
}
