import Link from "next/link";
import { logout } from "../actions";
import type { CurrentUser, Tenant } from "@/lib/api";
import { TenantSwitcher } from "./tenant-switcher";

const sections = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/members", label: "Members" },
  { href: "/dashboard/projects", label: "Projects" },
] as const;

export type Section = (typeof sections)[number]["href"];

export function AppHeader({
  user,
  tenant,
  active,
}: {
  user: CurrentUser;
  tenant: Tenant | undefined;
  active: Section;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-semibold text-white">
            T
          </div>
          {tenant && (
            <TenantSwitcher tenants={user.tenants} activeSlug={tenant.slug} />
          )}
          {tenant && (
            <nav className="flex gap-1 text-sm">
              {sections.map(({ href, label }) => (
                <Link
                  key={href}
                  href={`${href}?tenant=${tenant.slug}`}
                  aria-current={href === active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 font-medium ${
                    href === active
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            {user.name} <span className="text-zinc-400">@{user.username}</span>
          </span>
          <form action={logout}>
            <button className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function NoTenants() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-lg font-semibold">No tenants yet</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Ask an admin to add you to a tenant.
      </p>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 px-4 py-8">
      <div className="h-8 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
