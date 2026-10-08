import { redirect } from "next/navigation";
import { ProjectManager, type ProjectWithTasks } from "@/components/projects/ProjectManager";
import { createClient } from "@/lib/supabase/server";
import "../collection.css";
import "./projects.css";

export default async function ProjectsPage() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const { data, error } = await supabase
    .from("projects")
    .select("id,title,description,thumbnail,status,start_date,due_date,github_url,deploy_url,memo,created_at,updated_at,tasks(status)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return <ProjectManager initialProjects={(data ?? []) as ProjectWithTasks[]} userId={user.id} />;
}
