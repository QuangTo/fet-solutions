"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteSkeleton() {
  return (
    <main className="app-grid">
      <aside className="hidden border-r border-zinc-200 bg-[var(--shell-sidebar)] lg:flex lg:flex-col">
        <div className="flex h-12 items-center gap-2.5 border-b border-zinc-200/80 px-3">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <div className="flex-1 px-2 py-3">
          <Skeleton className="mb-2 h-3 w-10" />
          <div className="grid gap-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-8 rounded-md" key={index} />
            ))}
          </div>
        </div>
      </aside>
      <section className="min-w-0 px-4 pb-8 pt-16 sm:px-6 lg:px-7 lg:pt-6">
        <div className="mb-5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-[min(36rem,80vw)]" />
        </div>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-3 h-9 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
