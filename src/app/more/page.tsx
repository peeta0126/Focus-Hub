import Link from "next/link";
import { Icon } from "@/components/common/Icon";
import { primaryNavigation } from "@/components/layout/navigation";
import "../collection.css";

export default function MorePage() {
  return <main className="page-wrap"><div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>모든 공간</h1><p>계획부터 기록까지, 필요한 곳으로 이동하세요.</p></div></div><div className="more-grid">{primaryNavigation.map((item) => <Link href={item.href} className="card more-link" key={item.href}><span className="more-link-icon"><Icon name={item.icon} /></span><div><strong>{item.label}</strong><small>{item.group}</small></div><Icon name="chevron-right" /></Link>)}<Link href="/settings" className="card more-link"><span className="more-link-icon"><Icon name="settings" /></span><div><strong>설정</strong><small>테마와 기본 환경</small></div><Icon name="chevron-right" /></Link></div></main>;
}
