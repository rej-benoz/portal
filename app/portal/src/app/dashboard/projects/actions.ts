"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { apiErrorMessage, apiFetch, requireSessionToken } from "@/lib/api";

export type ProjectFormState = { error?: string; ok?: boolean };

function readForm(formData: FormData) {
  const progress = String(formData.get("progress") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    status: String(formData.get("status") ?? "ON_TRACK"),
    // Number("") is 0, so only convert when something was typed
    progress: progress === "" ? 0 : Number(progress),
  };
}

// The API validates and authorizes every write; these only forward them.
async function send(
  path: string,
  tenantId: string,
  init: RequestInit,
  fallback: string,
): Promise<ProjectFormState> {
  const token = await requireSessionToken();
  let response: Response;
  try {
    response = await apiFetch(path, { token, tenantId, ...init });
  } catch {
    return { error: "Can't reach the API. Please try again." };
  }
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    return { error: await apiErrorMessage(response, fallback) };
  }
  refresh();
  return { ok: true };
}

export async function createProject(
  tenantId: string,
  _state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const project = readForm(formData);
  if (!project.name) {
    return { error: "Give the project a name." };
  }
  return send(
    "/projects",
    tenantId,
    { method: "POST", body: JSON.stringify(project) },
    "Couldn't create the project.",
  );
}

export async function updateProject(
  tenantId: string,
  projectId: string,
  _state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const project = readForm(formData);
  if (!project.name) {
    return { error: "Give the project a name." };
  }
  return send(
    `/projects/${encodeURIComponent(projectId)}`,
    tenantId,
    { method: "PATCH", body: JSON.stringify(project) },
    "Couldn't save the project.",
  );
}

export async function deleteProject(
  tenantId: string,
  projectId: string,
): Promise<ProjectFormState> {
  return send(
    `/projects/${encodeURIComponent(projectId)}`,
    tenantId,
    { method: "DELETE" },
    "Couldn't delete the project.",
  );
}
