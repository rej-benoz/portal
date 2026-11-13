import type { Metadata } from "next";
import { Suspense } from "react";
import type { Tenant } from "@/lib/api";
import { getProjects } from "@/lib/projects";
import { getActiveTenant } from "@/lib/tenant";
import { AppHeader, NoTenants, PageSkeleton } from "../app-header";
import { RetryButton } from "../retry-button";
import { createProject } from "./actions";
import { ProjectForm } from "./project-form";
import { ProjectItem } from "./project-item";

export const metadata: Metadata = { title: "Projects · Tenant Portal" };

const card =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function ProjectsPage({
  searchParams,
}: PageProps<"/dashboard/projects">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<PageSkeleton />}>
        <Projects searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Projects({
  searchParams,
}: Pick<PageProps<"/dashboard/projects">, "searchParams">) {
  const { user, tenant } = await getActiveTenant(searchParams);

  return (
    <>
      <AppHeader user={user} tenant={tenant} active="/dashboard/projects" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        {tenant ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {tenant.role === "ADMIN"
                  ? `Create, edit and delete ${tenant.name}'s projects.`
                  : `${tenant.name}'s projects. Only admins can change them.`}
              </p>
            </div>
            {tenant.role === "ADMIN" && (
              <section className={card}>
                <h2 className="mb-3 font-semibold">New project</h2>
                <ProjectForm
                  // Reset the form when switching tenants
                  key={tenant.id}
                  action={createProject.bind(null, tenant.id)}
                  submitLabel="Create project"
                />
              </section>
            )}
            <Suspense key={tenant.id} fallback={<ProjectsSkeleton />}>
              <ProjectList tenant={tenant} />
            </Suspense>
          </>
        ) : (
          <NoTenants />
        )}
      </main>
    </>
  );
}

async function ProjectList({ tenant }: { tenant: Tenant }) {
  const result = await getProjects(tenant.id);

  if ("error" in result) {
    return (
      <div className={card} role="alert">
        <h2 className="font-semibold text-red-700 dark:text-red-400">
          Couldn&apos;t load projects
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{result.error}</p>
        <RetryButton className="mt-4" />
      </div>
    );
  }

  if (result.projects.length === 0) {
    return (
      <div className={`${card} p-10 text-center`}>
        <h2 className="font-semibold">No projects yet</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {tenant.role === "ADMIN"
            ? "Create the first one above."
            : "An admin hasn't created any projects yet."}
        </p>
      </div>
    );
  }

  return (
    <section className={card}>
      <h2 className="font-semibold">
        All projects{" "}
        <span className="text-sm font-normal text-zinc-500">({result.projects.length})</span>
      </h2>
      <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
        {result.projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            tenantId={tenant.id}
            canManage={tenant.role === "ADMIN"}
          />
        ))}
      </ul>
    </section>
  );
}

function ProjectsSkeleton() {
  return (
    <div className={`${card} animate-pulse space-y-3`} aria-busy="true" aria-label="Loading projects">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded bg-zinc-100 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
