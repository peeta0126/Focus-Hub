import Link from "next/link";
import { notFound } from "next/navigation";
import { isUuid } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import "../../collection.css";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) notFound();

  const projectResult = await supabase
    .from("projects")
    .select("id,title,description,status,progress,start_date,due_date,github_url,deploy_url,memo,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (projectResult.error) throw projectResult.error;
  if (!projectResult.data) notFound();

  const tasksResult = await supabase
    .from("tasks")
    .select("id,title,status")
    .eq("user_id", user.id)
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (tasksResult.error) throw tasksResult.error;

  const project = projectResult.data;
  const tasks = tasksResult.data ?? [];
  return <main className="page-wrap"><div className="page-heading"><div><Link href="/projects" className="link-more">← 프로젝트 목록</Link><h1 style={{ marginTop: 8 }}>{project.title}</h1><p>{project.description}</p></div><span className="count-badge">{project.status}</span></div><div className="section-grid"><section className="card card-pad" style={{ gridColumn: "span 2" }}><div className="card-header"><h2 className="card-title">프로젝트 개요</h2><b style={{ color: "var(--primary)" }}>{project.progress}%</b></div><div className="progress-track"><div className="progress-fill" style={{ width: `${project.progress}%` }} /></div><p style={{ color: "var(--subtext)", fontSize: ".75rem", lineHeight: 1.8, marginTop: 20 }}>시작일 {project.start_date ?? "미정"}<br />목표일 {project.due_date ?? "미정"}<br />최근 작업 {new Date(project.updated_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</p></section><section className="card card-pad"><div className="card-header"><h2 className="card-title">연결 링크</h2></div>{project.github_url ? <p><a href={project.github_url} target="_blank" rel="noreferrer">GitHub 열기</a></p> : null}{project.deploy_url ? <p><a href={project.deploy_url} target="_blank" rel="noreferrer">배포 페이지 열기</a></p> : null}{!project.github_url && !project.deploy_url ? <p className="card-meta">등록된 링크가 없습니다.</p> : null}</section><section className="card card-pad" style={{ gridColumn: "span 2" }}><div className="card-header"><h2 className="card-title">연결된 할 일</h2></div>{tasks.map((task) => <div className="data-row" key={task.id}><span>{task.status === "done" ? "☑" : "☐"}</span><div className="data-main"><strong>{task.title}</strong><p>{task.status}</p></div></div>)}{tasks.length === 0 ? <p className="card-meta">연결된 할 일이 없습니다.</p> : null}</section><section className="card card-pad"><div className="card-header"><h2 className="card-title">프로젝트 메모</h2></div><p className="card-meta">{project.memo || "등록된 메모가 없습니다."}</p></section></div></main>;
}
