import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "우리반",
    template: "%s | 우리반",
  },
  description: "학급 공지, 시간표, 급식, 자리배치까지 — 통합 학급 웹앱",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "우리반",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

// 페이지 렌더 전에 저장된 테마(또는 시스템 설정)를 적용해 깜빡임을 방지한다.
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
