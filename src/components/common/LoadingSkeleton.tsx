export function LoadingSkeleton({ label = "불러오는 중" }: { label?: string }) {
  return <div className="loading-skeleton" role="status"><span className="sr-only">{label}</span><div className="skeleton-line" /><div className="skeleton-line short" /><div className="skeleton-block" /><div className="skeleton-line" /></div>;
}
