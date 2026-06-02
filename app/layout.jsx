import "./globals.css";
import { AppProviders } from "./providers";

export const metadata = {
  title: "LMS",
  description: "Quản lý nhập hàng, xuất hàng và chốt hóa đơn.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
