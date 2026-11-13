import type { Metadata } from "next";
import { Suspense } from "react";
import type { Tenant } from "@/lib/api";
import { getMembers, type Member } from "@/lib/members";
import { getActiveTenant } from "@/lib/tenant";
import { AppHeader, NoTenants, PageSkeleton } from "../app-header";
import { RetryButton } from "../retry-button";
import { RoleSelect } from "./role-select";

export const metadata: Metadata = { title: "Members · Tenant Portal" };

const card =
  "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

export default function MembersPage({
  searchParams,
}: PageProps<"/dashboard/members">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <Suspense fallback={<PageSkeleton />}>
        <Members searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Members({
  searchParams,
}: Pick<PageProps<"/dashboard/members">, "searchParams">) {
  const { user, tenant } = await getActiveTenant(searchParams);

  return (
    <>
      <AppHeader user={user} tenant={tenant} active="/dashboard/members" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        {tenant ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                People in {tenant.name}.
                {tenant.role === "ADMIN"
                  ? " As an admin you can change their roles."
                  : " Only admins can change roles."}
              </p>
            </div>
            {/* Keyed by tenant so switching tenants shows the skeleton again */}
            <Suspense key={tenant.id} fallback={<MembersSkeleton />}>
              <MembersTable tenant={tenant} currentUserId={user.id} />
            </Suspense>
          </>
        ) : (
          <NoTenants />
        )}
      </main>
    </>
  );
}

async function MembersTable({
  tenant,
  currentUserId,
}: {
  tenant: Tenant;
  currentUserId: string;
}) {
  const result = await getMembers(tenant.id);

  if ("error" in result) {
    return (
      <div className={`${card} p-6`} role="alert">
        <h2 className="font-semibold text-red-700 dark:text-red-400">
          Couldn&apos;t load members
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {result.error}
        </p>
        <RetryButton className="mt-4" />
      </div>
    );
  }

  if (result.members.length === 0) {
    return (
      <div className={`${card} p-10 text-center`}>
        <h2 className="font-semibold">No members yet</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Nobody has been added to {tenant.name}.
        </p>
      </div>
    );
  }

  const canManage = tenant.role === "ADMIN";

  return (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
          <tr>
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {result.members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              tenantId={tenant.id}
              isSelf={member.id === currentUserId}
              canManage={canManage}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberRow({
  member,
  tenantId,
  isSelf,
  canManage,
}: {
  member: Member;
  tenantId: string;
  isSelf: boolean;
  canManage: boolean;
}) {
  return (
    <tr>
      <td className="px-5 py-3 font-medium">
        {member.name}
        {isSelf && <span className="ml-2 text-xs text-zinc-400">(you)</span>}
      </td>
      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
        {member.email}
      </td>
      <td className="px-5 py-3">
        {canManage && !isSelf ? (
          <RoleSelect
            tenantId={tenantId}
            memberId={member.id}
            memberName={member.name}
            initialRole={member.role}
          />
        ) : (
          <span
            title={
              canManage && isSelf
                ? "You can't remove your own admin access"
                : undefined
            }
          >
            <RoleBadge role={member.role} />
          </span>
        )}
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={member.status} />
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: Member["role"] }) {
  return role === "ADMIN" ? (
    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
      Admin
    </span>
  ) : (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      Member
    </span>
  );
}

function StatusBadge({ status }: { status: Member["status"] }) {
  return status === "ACTIVE" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-500/15 dark:text-red-300">
      Suspended
    </span>
  );
}

function MembersSkeleton() {
  return (
    <div
      className={`${card} animate-pulse space-y-3 p-5`}
      aria-busy="true"
      aria-label="Loading members"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-8 rounded bg-zinc-100 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
