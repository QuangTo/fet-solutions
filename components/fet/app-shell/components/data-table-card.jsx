"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DataTableCard({
  actions,
  children,
  className,
  description,
  descriptionPrefix,
  title,
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader
        className={cn(
          actions &&
            "sm:flex sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        )}
      >
        <div className="min-w-0 space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {descriptionPrefix ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full shrink-0 sm:w-72">{descriptionPrefix}</div>
              <CardDescription>{description}</CardDescription>
            </div>
          ) : (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
