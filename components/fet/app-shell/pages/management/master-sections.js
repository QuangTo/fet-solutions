import { Car, Users } from "lucide-react";

export const masterSections = [
  {
    description: "Nguồn chọn đối tác cho nhập kho, xuất hàng và báo cáo.",
    icon: Users,
    label: "Đối tác",
    listName: "customers",
    placeholder: "Tên đối tác",
  },
  {
    description: "Danh sách biển số xe dùng khi tạo phiếu xuất hàng.",
    icon: Car,
    label: "Xe vận chuyển",
    listName: "vehicles",
    placeholder: "Biển số xe",
  },
];
