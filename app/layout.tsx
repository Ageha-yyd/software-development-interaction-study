import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Intent Lab V3.3｜信息复用与意图调整原型",
  description: "公开、匿名可访问的Chat-only与Chat + Widget股票场景研究原型。使用固定虚构数据，不构成投资建议。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
