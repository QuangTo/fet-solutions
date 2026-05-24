"use client";

import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { dataTableConfigs } from "../lib/data-table-config";

export function DataTable({ children, className, width = "dispatch", wrap = false }) {
  const config = dataTableConfigs[width] || dataTableConfigs.dispatch;
  return (
    <Table
      className={cn(
        config.width,
        "fixed-data-table table-fixed",
        !wrap && "whitespace-nowrap",
        className,
      )}
    >
      <colgroup>
        {config.columns.map((columnWidth, index) => (
          <col key={`${width}-${index}`} style={{ width: columnWidth }} />
        ))}
      </colgroup>
      {children}
    </Table>
  );
}
