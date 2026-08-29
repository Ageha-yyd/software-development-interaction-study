import type { Metadata } from "next";
import V5Demo from "./V5Demo";

export const metadata: Metadata = {
  title: "Stock Research Agent V5.1｜Chat Object 交互原型",
  description: "普通 Agent Chat 中的对象展开、逐对象评论与显式判断提交实验原型。",
};

export default function V5Page() {
  return <V5Demo />;
}
