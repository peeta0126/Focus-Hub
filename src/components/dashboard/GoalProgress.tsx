import Link from "next/link";
import type { Goal } from "@/lib/types";

export function GoalProgress({ goals = [] }: { goals?: Goal[] }) {
  return <section className="card card-pad goals-card"><div className="card-header"><h2 className="card-title">목표 진행률</h2><Link href="/goals" className="link-more">관리 →</Link></div><div className="goal-list">{goals.map((goal) => <div className="goal-row" key={goal.id}><span className="goal-icon">{goal.icon}</span><div><div><strong>{goal.title}</strong><span>{goal.progress}%</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${goal.progress}%`, background: goal.progress > 60 ? "var(--primary)" : "var(--secondary)" }} /></div></div></div>)}</div>{goals.length === 0 && <div className="empty-state"><Link href="/goals">다음 목표를 정해보세요 →</Link></div>}</section>;
}
