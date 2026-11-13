"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Project, ProjectStatus } from "@/lib/projects";
import type { ProjectFormState } from "./actions";

const STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "ON_TRACK", label: "On track" },
  { value: "AT_RISK", label: "At risk" },
  { value: "DONE", label: "Done" },
];

const input =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900";

export function ProjectForm({
  action,
  project,
  submitLabel,
  onDone,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  project?: Project;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      if (!project) formRef.current?.reset();
      onDone?.();
    }
  }, [state, project, onDone]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-6">
      <label className="block text-sm font-medium sm:col-span-3">
        Name
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={project?.name}
          className={input}
        />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Status
        <select name="status" defaultValue={project?.status ?? "ON_TRACK"} className={input}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium sm:col-span-1">
        Progress %
        <input
          name="progress"
          type="number"
          min={0}
          max={100}
          step={1}
          defaultValue={project?.progress ?? 0}
          className={input}
        />
      </label>
      <label className="block text-sm font-medium sm:col-span-6">
        Description
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={project?.description}
          className={input}
        />
      </label>
      <div className="flex items-center gap-3 sm:col-span-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {onDone && project && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
