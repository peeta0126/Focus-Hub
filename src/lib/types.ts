export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ProjectStatus = "planning" | "active" | "paused" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  dueDate: string;
  dueTime?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  dueDate?: string;
  githubUrl?: string;
  deployUrl?: string;
  memo?: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  targetDate: string;
  status: "active" | "completed" | "paused";
  icon: string;
}

export interface Habit {
  id: string;
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  targetCount: number;
  active: boolean;
  completedToday: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
}
