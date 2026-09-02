import type { Metadata } from "next";
import ExperimentShell from "../components/experiment/ExperimentShell";
import { SOFTWARE_PRODUCT_DEVELOPMENT_V1 } from "../scenarios/software-product-development-v1";

export const metadata: Metadata = {
  title: "软件产品开发实验基座｜Chat 与可选对象",
  description: "白紫色浏览器实验基座：在冻结的软件产品开发材料上比较 Full Chat 与 Chat + Optional Objects。",
};

export default function HomePage() {
  return <ExperimentShell scenario={SOFTWARE_PRODUCT_DEVELOPMENT_V1} />;
}
