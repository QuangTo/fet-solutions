export const dataTableConfigs = {
  //Bảng xuất hàng
  //Ngày xuất|	Khách hàng|	Xe	|Tài xế	|Kho	|Loại hàng	|Số lượng	|Đơn vị
  dispatch: {
    columns: ["8%", "15%", "12%", "15%", "12%", "25%", "8%", "8%"],
    width: "min-w-[1040px]",
  },
  invoice: {
    columns: ["18%", "30%", "32%", "20%"],
    width: "min-w-[720px]",
  },
  //Quản lý
  management: {
    columns: ["46%", "18%", "20%", "16%"],
    width: "min-w-[760px]",
  },
  /** Tài khoản, Kho hàng — cùng 5 cột: tên, chi tiết, trạng thái, cập nhật, thao tác */
  managementEntity: {
    columns: ["30%", "18%", "16%", "20%", "16%"],
    width: "min-w-[800px]",
  },
  billingInvoices: {
    columns: ["28%", "24%", "24%", "24%"],
    width: "min-w-[680px]",
  },
  //Tổng hợp hàng nhập (cùng trang nhap-hang)
  receiptHistory: {
    columns: ["15%", "20%", "35%", "15%", "15%"],
    width: "min-w-[720px]",
  },
  receiptSummary: {
    columns: ["50%", "30%", "20%"],
    width: "w-full min-w-[520px]",
  },
};
