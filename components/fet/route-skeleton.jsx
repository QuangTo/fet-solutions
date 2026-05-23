"use client";

import { LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteSkeleton() {
  return (
    <main className="app-grid">
      <aside className="hidden bg-slate-950 p-5 text-white lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600 text-sm font-black">
            FET
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32 bg-white/20" />
            <Skeleton className="h-3 w-24 bg-white/15" />
          </div>
        </div>
        <div className="mt-8 grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton className="h-11 rounded-md bg-white/10" key={index} />
          ))}
        </div>
      </aside>
      <section className="min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-emerald-700">
              <LayoutDashboard className="h-4 w-4" />
              FES logistics
            </p>
            <Skeleton className="h-10 w-56" />
            <Skeleton className="mt-3 h-4 w-[min(42rem,80vw)]" />
          </div>
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
