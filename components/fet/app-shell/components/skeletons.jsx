"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  operationActionButtonClass,
  operationActionButtonShellClass,
} from "../lib/constants";
import { DataTableCard } from "./data-table-card";

export function LoadingSkeleton({ page }) {
  if (page === "dashboard") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-3 h-9 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <Skeleton className="h-32 rounded-lg" key={item} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="h-[320px]">
              <Skeleton className="h-full w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (page === "quan-ly") {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <Card key={item}>
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (page === "bao-cao") {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <Skeleton className="h-40 rounded-lg" key={item} />
              ))}
            </div>
          </CardContent>
        </Card>
        <TableSkeleton columns={8} rows={4} title="Lịch sử xuất hàng" />
        <TableSkeleton columns={3} rows={4} title="Lịch sử xuất hóa đơn" />
      </div>
    );
  }

  if (page === "nhap-hang") {
    return (
      <div className="grid gap-4">
        <div className="grid items-stretch gap-4 xl:grid-cols-2">
          <FormSkeleton title="Ghi nhận hàng nhập" fields={5} />
          <TableSkeleton columns={3} rows={5} title="Tổng hợp hàng nhập" />
        </div>
        <TableSkeleton columns={4} rows={5} title="Lịch sử nhập hàng" />
      </div>
    );
  }

  if (page === "xuat-hang") {
    return (
      <div className="grid gap-4">
        <FormSkeleton title="Tạo phiếu xuất hàng" fields={7} />
        <TableSkeleton columns={8} rows={5} title="Lịch sử xuất hàng" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}

export function FormSkeleton({ fields = 4, title }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: fields }).map((_, index) => (
            <div className="grid gap-2" key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
          <div className={cn(operationActionButtonShellClass, "lg:col-span-2")}>
            <Skeleton className={cn("h-11", operationActionButtonClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ columns = 4, rows = 5, title }) {
  return (
    <DataTableCard description=" " title={title}>
      <div className="grid max-w-full gap-3 overflow-x-auto overscroll-x-contain">
        <div
          className="grid min-w-max gap-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(88px, 1fr))`,
          }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton className="h-4" key={index} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            className="grid min-w-max gap-3 border-t border-slate-100 pt-3"
            key={rowIndex}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(88px, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                className={cn(
                  "h-5",
                  columnIndex === 0 && "w-20",
                  columnIndex === columns - 1 && "w-16",
                )}
                key={columnIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </DataTableCard>
  );
}
