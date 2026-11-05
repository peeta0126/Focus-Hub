import Link from "next/link";
import { AssetImage } from "@/components/common/AssetImage";
import { getProjectThumbnail } from "@/lib/assets";
import type { Project } from "@/lib/types";

export function ActiveProjects({ projects = [] }: { projects?: Project[] }) {
  return <section className="card card-pad projects-card"><div className="card-header"><h2 className="card-title">진행 중인 프로젝트</h2><Link href="/projects" className="link-more">모두 보기 →</Link></div><div className="project-list">{projects.map((project) => <Link href={`/projects/${project.id}`} className="project-mini" key={project.id}><div className="project-thumb"><AssetImage src={getProjectThumbnail(project.title, project.thumbnail)} alt={`${project.title} 썸네일`} emoji="✦" sizes="64px" /></div><div className="project-info"><div><strong>{project.title}</strong><span>{project.progress}%</span></div><p>{project.status === "active" ? "진행 중" : "기획 중"} · {project.updatedAt}</p><div className="progress-track"><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div></div></Link>)}</div>{projects.length === 0 && <div className="empty-state"><Link href="/projects">첫 프로젝트를 시작해보세요 →</Link></div>}</section>;
}
