import type { Metadata } from "next";
import ResearchSession from "../../../components/experiment/ResearchSession";

export const metadata: Metadata = {
  title: "软件开发 v4.2｜研究流程预览",
  description: "共同接管、四个隔离任务与开放开发的研究者工程走查；非正式采集。",
};

export default function ResearchPreviewPage() {
  return <ResearchSession />;
}
