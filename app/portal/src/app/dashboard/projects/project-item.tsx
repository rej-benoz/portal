"use client";

import { useState, useTransition } from "react";
import type { Project } from "@/lib/projects";
import { deleteProject, updateProject } from "./actions";
import { ProjectForm } from "./project-form";

const statusStyles: Record<Project["status"], [string, string]> = {
  ON_TRACK: ["On track", "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"],
  AT_RISK: ["At risk", "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"],
  DONE: ["Done", "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"],
};

export function ProjectItem({
  project,
  tenantId,
  canManage,
}: {
  project: Project;
  tenantId: string;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [label, style] = statusStyles[project.status];

  if (editing) {
    return (
      <li className="py-4">
        <ProjectForm
          action={updateProject.bind(null, tenantId, project.id)}
          project={project}
          submitLabel="Save"
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  function remove() {
    if (!confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    setError(null);
    startDelete(async () => {
      const result = await deleteProject(tenantId, project.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className={`flex flex-wrap items-center gap-4 py-3 ${deleting ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {project.description || "No description"}
          {project.createdBy && ` · by ${project.createdBy.name}`}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{label}</span>
      <div className="hidden w-32 sm:block">
        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-indigo-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
        {project.progress}%
      </span>
      {canManage && (
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2 py-1 font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="rounded-md px-2 py-1 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </li>
  );
}
