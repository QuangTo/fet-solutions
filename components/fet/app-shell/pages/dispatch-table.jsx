"use client";

import { formatDate } from "@/lib/fet-domain";
import { EmptyRow, Td, Th } from "@/components/ui/table";
import { DataTable } from "../components/data-table";
import { number } from "../lib/format";

export function DispatchTable({ rows }) {
  return (
    <DataTable width="dispatch">
      <thead>
        <tr>
          <Th>Ngày xuất</Th>
          <Th>Khách hàng</Th>
          <Th>Xe</Th>
          <Th>Tài xế</Th>
          <Th>Xuất hàng</Th>
          <Th>Loại hàng</Th>
          <Th>Số lượng</Th>
          <Th>Đơn vị</Th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((item) => (
            <tr key={item.id}>
              <Td data-label="Ngày xuất">{formatDate(item.date)}</Td>
              <Td data-label="Khách hàng">{item.customer}</Td>
              <Td data-label="Xe">
                <strong>{item.truck}</strong>
              </Td>
              <Td data-label="Tài xế">{item.driver}</Td>
              <Td data-label="Xuất hàng">{item.warehouse || "—"}</Td>
              <Td data-label="Loại hàng">{item.sku}</Td>
              <Td data-label="Số lượng">{number(item.quantity)}</Td>
              <Td data-label="Đơn vị">{item.unit || "đơn vị"}</Td>
            </tr>
          ))
        ) : (
          <EmptyRow colSpan={8}>
            Chưa có lịch sử xuất hàng phù hợp với bộ lọc hiện tại.
          </EmptyRow>
        )}
      </tbody>
    </DataTable>
  );
}
