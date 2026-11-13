import "server-only";
import { redirect } from "next/navigation";
import { apiErrorMessage, apiFetch, requireSessionToken } from "./api";

export type ProjectStatus = "ON_TRACK" | "AT_RISK" | "DONE";

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
};

export type ProjectsResult = { projects: Project[] } | { error: string };

// Not cached, like members: the list changes through this page's own actions.
export async function getProjects(tenantId: string): Promise<ProjectsResult> {
  const token = await requireSessionToken();

  let response: Response;
  try {
    response = await apiFetch("/projects", { token, tenantId });
  } catch {
    return { error: "Can't reach the API. Please try again." };
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return {
      error: await apiErrorMessage(response, "Couldn't load the projects."),
    };
  }
  return { projects: await response.json() };
}
