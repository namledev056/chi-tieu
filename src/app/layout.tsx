import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import RegisterSW from "./RegisterSW";

const font = Be_Vietnam_Pro({
  variable: "--font-main",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Chi tiêu",
  description: "Ghi chép thu chi, theo dõi ngân sách hàng tháng.",
  applicationName: "Chi tiêu",
  appleWebApp: {
    capable: true,
    title: "Chi tiêu",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#15171a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={font.variable}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
