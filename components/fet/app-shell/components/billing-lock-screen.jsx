"use client";

import { Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LOCK_DESCRIPTION =
  "Tài khoản của bạn vẫn đăng nhập được để xem dữ liệu. Không thể tạo phiếu nhập, xuất hàng mới cho đến khi quản trị viên hoặc kế toán thanh toán gói Plus.";
const LOCK_FOOTER =
  "Liên hệ quản trị viên để thanh toán và mở khóa site.";

export function BillingLockScreen() {
  return (
    <Card className="mx-auto w-full max-w-lg border-red-200 bg-red-50/40">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700">
          <Lock className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-black text-slate-950">
          Site tạm khóa ghi dữ liệu
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          {LOCK_DESCRIPTION}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <p className="text-center text-sm font-semibold text-slate-700">
          {LOCK_FOOTER}
        </p>
      </CardContent>
    </Card>
  );
}
