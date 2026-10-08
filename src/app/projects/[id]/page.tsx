import { notFound } from "next/navigation";
import { ProjectDetail, type ProjectDetailRow, type ProjectTaskRow } from "@/components/projects/ProjectDetail";
import { isUuid } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import "../../collection.css";
import "../projects.css";

export default async function ProjectDetailPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) notFound();

  const [projectResult, tasksResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,description,status,start_date,due_date,github_url,deploy_url,memo,created_at,updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select("id,title,description,status,priority,category,due_date,due_time,project_id,created_at")
      .eq("user_id", user.id)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (projectResult.error) throw projectResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (!projectResult.data) notFound();

  return (
    <ProjectDetail
      initialProject={projectResult.data as ProjectDetailRow}
      initialTasks={(tasksResult.data ?? []) as ProjectTaskRow[]}
      userId={user.id}
    />
  );
}
