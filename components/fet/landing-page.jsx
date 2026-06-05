import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { SUPPORT_CHAT_URL } from "@/components/fet/app-shell/lib/constants";
import { LandingHeader } from "@/components/fet/landing-header";
import { Button } from "@/components/ui/button";

const navItems = [
  ["Quy trình", "#quy-trinh"],
  ["Tính năng", "#tinh-nang"],
  ["Báo cáo", "#bao-cao"],
  ["Hỗ trợ", "#ho-tro"],
];

const featureCards = [
  {
    action: "Bắt đầu quy trình",
    copy: "Phân loại hàng hóa theo SKU, khách hàng và vị trí kho lưu trữ ngay tại cửa nhập.",
    icon: PackageCheck,
    title: "Nhập hàng",
  },
  {
    action: "Lệnh xuất kho mới",
    copy: "Điều phối xe, tài xế và số lượng xuất dựa trên tồn kho khả dụng theo từng khách hàng.",
    icon: Truck,
    title: "Xuất hàng",
  },
  {
    action: "Xem báo cáo",
    copy: "Hỗ trợ kế toán kết toán khi tồn kho khách hàng về 0, giảm sai sót đối soát cuối kỳ.",
    icon: ClipboardCheck,
    title: "Chốt hóa đơn",
  },
];

const workflowSteps = [
  [
    "1",
    "Nhập liệu gốc",
    "Thủ kho tạo chứng từ, kiểm đếm SKU và ghi nhận kho nhận hàng.",
  ],
  [
    "2",
    "Kế hoạch vận tải",
    "Đội vận hành gán biển số, tài xế và số lượng cho từng lệnh xuất.",
  ],
  [
    "3",
    "Kiểm soát tồn",
    "Tồn kho được tính tự động từ dữ liệu nhập và xuất, không sửa tay.",
  ],
  [
    "4",
    "Phê duyệt và đóng",
    "Kế toán xác nhận hóa đơn sau khi tồn kho của khách hàng về 0.",
  ],
];

const roleHighlights = [
  [
    "Dữ liệu hợp nhất",
    "Tồn kho tính toán dựa trên dòng dữ liệu thực, không ghi tay.",
  ],
  [
    "Quản lý thực thể",
    "Hồ sơ khách hàng, phương tiện, tài xế và kho được dùng làm nguồn chọn.",
  ],
  [
    "Xác thực đa tầng",
    "Lịch sử phê duyệt minh bạch cho các giao dịch kế toán quan trọng.",
  ],
  [
    "Cảnh báo tức thì",
    "Nhận diện sớm sai lệch giữa lệnh xuất, số lượng tồn và trạng thái chốt kỳ.",
  ],
];

const footerLinks = ["Chính sách bảo mật", "Điều khoản sử dụng"];

const landingPrimaryButtonClassName =
  "group h-12 w-[15rem] justify-center rounded-lg bg-[#059669] px-6 text-base font-black text-[#ffffff] shadow-lg shadow-[#059669]/20 transition-all duration-200 hover:bg-[#047857] hover:text-[#ffffff] hover:shadow-xl hover:shadow-[#059669]/30 active:scale-[0.98] sm:h-14 sm:w-[16.5rem] sm:px-8";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#131b2e]">
      <style>{`body { background: #ffffff; }`}</style>
      <LandingHeader navItems={navItems} />

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 py-8 sm:space-y-20 sm:px-6 sm:py-12 md:space-y-24 lg:px-8">
        <section className="grid items-center gap-8 pt-2 sm:gap-10 lg:grid-cols-12 lg:gap-12 lg:pt-4">
          <div className="space-y-6 sm:space-y-8 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#059669]/10 bg-[#059669]/5 px-3 py-1.5 sm:gap-2.5 sm:px-4 sm:py-2">
              <Warehouse
                className="h-4 w-4 shrink-0 text-[#059669] sm:h-5 sm:w-5"
                aria-hidden="true"
              />
              <span className="text-[10px] font-black uppercase leading-none text-[#059669] sm:text-xs">
                Độ chính xác vận hành
              </span>
            </div>
            <div>
              <h1 className="max-w-3xl text-[1.75rem] font-black leading-tight text-[#131b2e] sm:text-4xl lg:text-[2.75rem]">
                Vận hành kho và kế toán theo nhịp độ thực tế.
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-[#3d4a42] sm:mt-6 sm:text-lg sm:leading-8">
                LMS đồng bộ hóa từng chuyển động: từ xe hàng cập bến, thủ kho
                ghi nhận nhập xuất, đến khi kế toán chốt hóa đơn cuối kỳ với dữ
                liệu tồn kho chính xác.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-4 sm:pt-2">
              <Button asChild className={landingPrimaryButtonClassName}>
                <Link href="/demo">
                  Bắt đầu miễn phí
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="overflow-hidden rounded-lg bg-[#e2e7ff] p-2 shadow-2xl sm:p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#bccac0]">
                <Image
                  src="/images/lms-landing-hero.png"
                  alt="Vận hành kho hiện đại với xe tải, hàng hóa và bảng điều hành LMS"
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[#bccac0] bg-[#ffffff] p-4 shadow-xl sm:p-5 md:absolute md:-bottom-5 md:left-4 md:mt-0 md:max-w-[280px]">
              <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#059669]" />
                  <span className="text-xs font-black text-[#131b2e]">
                    Cầu hàng #04
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#3d4a42]">
                  10:45
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#eaedff]">
                  <div className="h-full w-2/3 rounded-full bg-[#059669]" />
                </div>
                <p className="text-sm font-medium leading-5 text-[#3d4a42]">
                  Hàng đã vào kho. Đang đối soát chứng từ và cập nhật tồn.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="tinh-nang"
          className="grid scroll-mt-[4.5rem] gap-4 sm:scroll-mt-28 sm:gap-6 md:grid-cols-3"
        >
          {featureCards.map(({ action, copy, icon: Icon, title }) => (
            <article
              key={title}
              className="group flex flex-col gap-4 rounded-lg border border-[#bccac0] bg-[#ffffff] p-5 shadow-sm transition sm:min-h-[280px] sm:gap-6 sm:p-8 md:hover:-translate-y-1 md:hover:border-[#059669]/40 md:hover:shadow-xl"
            >
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#059669]/10 text-[#059669] transition-colors group-hover:bg-[#059669] group-hover:text-[#ffffff] sm:h-14 sm:w-14">
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              </div>
              <div>
                <h2 className="mb-2 text-lg font-black text-[#131b2e] sm:mb-3 sm:text-xl">
                  {title}
                </h2>
                <p className="text-sm font-medium leading-6 text-[#3d4a42] sm:text-base sm:leading-7">
                  {copy}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-black text-[#059669] transition-all group-hover:gap-4">
                {action}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </article>
          ))}
        </section>

        <section
          id="quy-trinh"
          className="grid scroll-mt-[4.5rem] items-start gap-8 sm:scroll-mt-28 sm:gap-12 lg:grid-cols-12"
        >
          <div className="rounded-lg border border-[#bccac0] bg-[#f2f3ff]/60 p-5 sm:p-6 md:p-8 lg:col-span-5">
            <div className="mb-6 flex items-center justify-between gap-4 sm:mb-10">
              <div>
                <span className="text-xs font-black uppercase text-[#059669]">
                  Timeline
                </span>
                <h2 className="mt-1 text-xl font-black text-[#131b2e] sm:mt-2 sm:text-2xl">
                  Lộ trình chứng từ
                </h2>
              </div>
              <div className="rounded-lg border border-[#bccac0] bg-[#ffffff] p-3">
                <BarChart3
                  className="h-5 w-5 text-[#3d4a42]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="relative grid gap-5 sm:gap-8">
              <div className="absolute bottom-6 left-5 top-6 w-0.5 bg-[#bccac0] sm:bottom-8 sm:top-8" />
              {workflowSteps.map(([step, title, copy], index) => (
                <div key={step} className="relative z-10 flex gap-3 sm:gap-5">
                  <div
                    className={
                      index === 0
                        ? "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#059669] text-sm font-black text-[#ffffff] shadow-md sm:h-10 sm:w-10"
                        : "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#bccac0] bg-[#e2e7ff] text-sm font-black text-[#3d4a42] sm:h-10 sm:w-10"
                    }
                  >
                    {step}
                  </div>
                  <div className="flex-1 rounded-lg border border-[#bccac0] bg-[#ffffff] p-4 transition hover:border-[#059669] sm:p-5">
                    <h3 className="text-base font-black text-[#131b2e]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#3d4a42]">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            id="bao-cao"
            className="scroll-mt-[4.5rem] space-y-8 py-2 sm:scroll-mt-28 sm:space-y-10 sm:py-4 lg:col-span-7 lg:pl-8"
          >
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 text-[#059669]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-black uppercase sm:text-sm">
                  Phân quyền thông minh
                </span>
              </div>
              <h2 className="text-2xl font-black leading-tight text-[#131b2e] sm:text-3xl">
                Giao diện tối ưu cho từng mắt xích trong vận hành.
              </h2>
              <p className="max-w-2xl text-base font-medium leading-7 text-[#3d4a42] sm:text-lg sm:leading-8">
                Từ thiết bị di động của tài xế đến bảng điều khiển của quản trị
                viên, LMS cung cấp đúng dữ liệu cho đúng vai trò ở đúng thời
                điểm.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
              {roleHighlights.map(([title, copy]) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="mt-1 rounded-lg bg-[#059669]/10 p-2 text-[#059669]">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-black text-[#131b2e]">{title}</h3>
                    <p className="text-sm font-medium leading-6 text-[#3d4a42]">
                      {copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className={landingPrimaryButtonClassName}>
              <a href="#ho-tro">
                Trải nghiệm demo
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <section id="ho-tro" className="scroll-mt-[4.5rem] bg-[#ffffff] text-[#131b2e] sm:scroll-mt-24">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 border-t border-[#bccac0] px-4 py-12 sm:gap-6 sm:px-6 sm:py-16 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div className="md:w-full">
            <span className="text-xs font-black uppercase text-[#059669] sm:text-sm">
              Hỗ trợ triển khai
            </span>
            <p className="mt-2 max-w-2xl text-base font-medium leading-7 text-[#3d4a42] sm:mt-3 sm:text-lg sm:leading-8">
              Chat với support để được cấp tài khoản demo, tư vấn quy trình nhập
              xuất hàng và cấu hình hệ thống cho đội vận hành.
            </p>
          </div>
          <div className="flex w-full justify-start md:justify-center">
            <Button asChild className={landingPrimaryButtonClassName}>
              <a href={SUPPORT_CHAT_URL} rel="noreferrer" target="_blank">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat với support
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-[#111827] text-[#ffffff]">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-10 sm:gap-6 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <p className="text-sm font-medium text-[#dae2fd]/80">
              © 2026 LMS Management System. All rights reserved.
            </p>
            <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <div className="flex flex-wrap gap-6">
                {footerLinks.map((label) => (
                  <a
                    key={label}
                    className="text-xs font-bold text-[#dae2fd]/80 transition-colors hover:text-[#ffffff]"
                    href="#ho-tro"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
