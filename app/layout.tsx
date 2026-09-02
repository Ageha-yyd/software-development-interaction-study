import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Software Development Interaction Study",
  description: "面向软件产品开发任务的浏览器实验基座。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
