import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export default function Loading() {
  return <div className="page-wrap"><LoadingSkeleton label="화면을 불러오는 중" /></div>;
}
