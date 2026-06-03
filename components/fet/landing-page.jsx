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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#131b2e]">
      <style>{`body { background: #ffffff; }`}</style>
      <header className="sticky top-0 z-50 w-full border-b border-[#bccac0] bg-[#ffffff]/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-10">
            <Link
              href="/"
              className="text-2xl font-black text-[#059669]"
              aria-label="Trang chủ LMS"
            >
              LMS
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              {navItems.map(([label, href], index) => (
                <a
                  key={label}
                  className={
                    index === 0
                      ? "border-b-2 border-[#059669] pb-1 text-base font-semibold text-[#059669]"
                      : "text-base font-medium text-[#3d4a42] transition-colors hover:text-[#059669]"
                  }
                  href={href}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <a
              className="text-sm font-black text-[#059669] md:hidden"
              href="#ho-tro"
            >
              Hỗ trợ
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-24 px-4 py-12 sm:px-6 lg:px-8">
        <section className="grid items-center gap-12 pt-4 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-6">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[#059669]/10 bg-[#059669]/5 px-4 py-2">
              <Warehouse
                className="h-5 w-5 text-[#059669]"
                aria-hidden="true"
              />
              <span className="text-xs font-black uppercase text-[#059669]">
                Độ chính xác vận hành
              </span>
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight text-[#131b2e]">
                Vận hành kho và kế toán theo nhịp độ thực tế.
              </h1>
              <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-[#3d4a42]">
                LMS đồng bộ hóa từng chuyển động: từ xe hàng cập bến, thủ kho
                ghi nhận nhập xuất, đến khi kế toán chốt hóa đơn cuối kỳ với dữ
                liệu tồn kho chính xác.
              </p>
            </div>
            <div className="flex flex-col gap-4 pt-2 sm:flex-row">
              <Button
                asChild
                className="h-14 rounded-lg bg-[#059669] px-8 text-base font-black text-[#ffffff] shadow-lg shadow-[#059669]/20 hover:bg-[#059669]"
              >
                <Link href="/demo">
                  Bắt đầu miễn phí
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="overflow-hidden rounded-lg bg-[#e2e7ff] p-3 shadow-2xl">
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
            <div className="absolute -bottom-5 left-4 hidden max-w-[280px] rounded-lg border border-[#bccac0] bg-[#ffffff] p-5 shadow-xl md:block">
              <div className="mb-4 flex items-center justify-between gap-4">
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
          className="grid scroll-mt-28 gap-6 md:grid-cols-3"
        >
          {featureCards.map(({ action, copy, icon: Icon, title }) => (
            <article
              key={title}
              className="group flex min-h-[280px] flex-col gap-6 rounded-lg border border-[#bccac0] bg-[#ffffff] p-8 shadow-sm transition hover:-translate-y-1 hover:border-[#059669]/40 hover:shadow-xl"
            >
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-[#059669]/10 text-[#059669] transition-colors group-hover:bg-[#059669] group-hover:text-[#ffffff]">
                <Icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <div>
                <h2 className="mb-3 text-xl font-black text-[#131b2e]">
                  {title}
                </h2>
                <p className="text-base font-medium leading-7 text-[#3d4a42]">
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
          className="grid scroll-mt-28 items-start gap-12 lg:grid-cols-12"
        >
          <div className="rounded-lg border border-[#bccac0] bg-[#f2f3ff]/60 p-6 sm:p-8 lg:col-span-5">
            <div className="mb-10 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase text-[#059669]">
                  Timeline
                </span>
                <h2 className="mt-2 text-2xl font-black text-[#131b2e]">
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

            <div className="relative grid gap-8">
              <div className="absolute bottom-8 left-5 top-8 w-0.5 bg-[#bccac0]" />
              {workflowSteps.map(([step, title, copy], index) => (
                <div key={step} className="relative z-10 flex gap-5">
                  <div
                    className={
                      index === 0
                        ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#059669] text-sm font-black text-[#ffffff] shadow-md"
                        : "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#bccac0] bg-[#e2e7ff] text-sm font-black text-[#3d4a42]"
                    }
                  >
                    {step}
                  </div>
                  <div className="flex-1 rounded-lg border border-[#bccac0] bg-[#ffffff] p-5 transition hover:border-[#059669]">
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
            className="scroll-mt-28 space-y-10 py-4 lg:col-span-7 lg:pl-8"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-[#059669]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-black uppercase">
                  Phân quyền thông minh
                </span>
              </div>
              <h2 className="text-3xl font-black leading-tight text-[#131b2e]">
                Giao diện tối ưu cho từng mắt xích trong vận hành.
              </h2>
              <p className="max-w-2xl text-lg font-medium leading-8 text-[#3d4a42]">
                Từ thiết bị di động của tài xế đến bảng điều khiển của quản trị
                viên, LMS cung cấp đúng dữ liệu cho đúng vai trò ở đúng thời
                điểm.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
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

            <Button
              asChild
              className="h-14 rounded-lg bg-[#e2e7ff] px-8 text-base font-black text-[#131b2e] hover:bg-[#059669] hover:text-[#ffffff]"
            >
              <a href="#ho-tro">
                Bắt đầu trải nghiệm demo
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <section id="ho-tro" className="scroll-mt-24 bg-[#ffffff] text-[#131b2e]">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 border-t border-[#bccac0] px-4 py-24 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
          <div className="md:w-full">
            <span className="text-sm font-black uppercase text-[#059669]">
              Hỗ trợ triển khai
            </span>
            <p className="mt-3 max-w-2xl text-lg font-medium leading-8 text-[#3d4a42]">
              Chat với support để được cấp tài khoản demo, tư vấn quy trình nhập
              xuất hàng và cấu hình hệ thống cho đội vận hành.
            </p>
          </div>
          <div className="flex w-full justify-start md:justify-center">
            <Button
              asChild
              className="bg-[#059669] text-[#ffffff] hover:bg-[#059669]"
            >
              <a href={SUPPORT_CHAT_URL} rel="noreferrer" target="_blank">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat với support
              </a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-[#111827] text-[#ffffff]">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-16 sm:px-6 lg:px-8">
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
