import type { Metadata } from "next";
import ExperimentShell from "../../../components/experiment/ExperimentShell";
import { SOFTWARE_PRODUCT_DEVELOPMENT_V1 } from "../../../scenarios/software-product-development-v1";

export const metadata: Metadata = {
  title: "Software Product Development · Episode 01",
  description: "软件产品开发 A/B 浏览器实验工程预览。",
};

export default function SoftwareProductDevelopmentStudyPage() {
  return <ExperimentShell scenario={SOFTWARE_PRODUCT_DEVELOPMENT_V1} />;
}
