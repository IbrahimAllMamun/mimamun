"use client";

import { useRouter } from "next/navigation";
import { KeyRound, LogOut, Pencil, Plus, Shield, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import {
  ALL_PERMISSIONS,
  PASSWORD_MIN_LENGTH,
  PERMISSION_DESCRIPTIONS,
  type AdminUserDTO,
  type Permission,
  type RoleDTO,
  type SessionListItemDTO,
} from "@portfolio/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status";
import { apiRequest, fieldErrors } from "@/lib/api/client";
import { Dialog, useConfirm } from "../dialog";
import { AdminPageHeader, EmptyPanel, ErrorPanel, LoadingRows, Panel, relativeTime } from "../page";
import { useSession } from "../session";
import { useToast } from "../toast";
import { useApiQuery } from "../use-api";

// ── Users ────────────────────────────────────────────────────────────────

type UserForm = {
  id?: string;
  email: string;
  name: string;
  roleId: string;
  password: string;
  status: "active" | "disabled";
};

export function UsersPage() {
  const session = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const users = useApiQuery<AdminUserDTO[]>("/api/admin/users");
  const roles = useApiQuery<RoleDTO[]>("/api/admin/roles");
  const [editing, setEditing] = useState<UserForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const result = editing.id
      ? await apiRequest("PUT", `/api/admin/users/${editing.id}`, {
          name: editing.name,
          roleId: editing.roleId,
          status: editing.status,
        })
      : await apiRequest("POST", "/api/admin/users", {
          email: editing.email,
          name: editing.name,
          roleId: editing.roleId,
          password: editing.password,
        });
    setSaving(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.error.details));
      toast.error(result.error.message);
      return;
    }
    toast.success(editing.id ? "User updated" : "User created");
    setEditing(null);
    users.reload();
  };

  const remove = async (user: AdminUserDTO) => {
    if (
      !(await confirm({
        title: `Delete ${user.name}?`,
        body: "Their sessions end immediately. Content they created stays.",
        confirmLabel: "Delete user",
        tone: "danger",
      }))
    )
      return;
    const result = await apiRequest("DELETE", `/api/admin/users/${user.id}`);
    if (!result.ok) return toast.error(result.error.message);
    toast.success("User deleted");
    users.reload();
  };

  const unlock = async (user: AdminUserDTO) => {
    const result = await apiRequest("POST", `/api/admin/users/${user.id}/unlock`);
    if (!result.ok) return toast.error(result.error.message);
    toast.success(`${user.name} can sign in again`);
    users.reload();
  };

  const defaultRole =
    roles.data?.find((role) => role.key === "EDITOR")?.id ?? roles.data?.[0]?.id ?? "";

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="People who can sign in to the admin. Permissions come from their role."
        actions={
          <Button
            onClick={() => {
              setErrors({});
              setEditing({
                email: "",
                name: "",
                roleId: defaultRole,
                password: "",
                status: "active",
              });
            }}
            disabled={!roles.data}
          >
            <Icon icon={Plus} size={16} /> Add user
          </Button>
        }
      />
      {users.error ? <ErrorPanel error={users.error} onRetry={users.reload} /> : null}
      {!users.data && !users.error ? <LoadingRows /> : null}
      {users.data ? (
        <div className="overflow-x-auto rounded-md border border-rule bg-elevated">
          <table className="w-full text-sm">
            <thead className="border-b border-rule bg-surface text-left">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium text-ink-2">
                  Name
                </th>
                <th scope="col" className="px-4 py-2 font-medium text-ink-2">
                  Role
                </th>
                <th scope="col" className="px-4 py-2 font-medium text-ink-2">
                  Status
                </th>
                <th scope="col" className="hidden px-4 py-2 font-medium text-ink-2 md:table-cell">
                  Last sign-in
                </th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {users.data.map((user) => {
                const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">
                        {user.name}
                        {user.id === session.user.id ? (
                          <span className="ml-2 text-xs font-normal text-ink-3">(you)</span>
                        ) : null}
                      </p>
                      <p className="text-ink-3">{user.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{user.role.name}</td>
                    <td className="px-4 py-2.5">
                      {locked ? (
                        <StatusBadge tone="attention">Locked</StatusBadge>
                      ) : user.status === "active" ? (
                        <StatusBadge tone="positive">Active</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">Disabled</StatusBadge>
                      )}
                    </td>
                    <td className="hidden px-4 py-2.5 text-ink-3 md:table-cell">
                      {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        {locked ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void unlock(user)}
                            aria-label={`Unlock ${user.name}`}
                          >
                            <Icon icon={Unlock} size={14} />
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setErrors({});
                            setEditing({
                              id: user.id,
                              email: user.email,
                              name: user.name,
                              roleId: user.role.id,
                              password: "",
                              status: user.status,
                            });
                          }}
                          aria-label={`Edit ${user.name}`}
                        >
                          <Icon icon={Pencil} size={14} />
                        </Button>
                        {user.id !== session.user.id ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void remove(user)}
                            aria-label={`Delete ${user.name}`}
                          >
                            <Icon icon={Trash2} size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit user" : "Add user"}
        description={
          editing?.id
            ? undefined
            : "Share the password with them securely; they can change it under Account."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} pending={saving}>
              {editing?.id ? "Save" : "Create user"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <Field label="Name" required error={errors.name}>
              {(props) => (
                <Input
                  {...props}
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                />
              )}
            </Field>
            <Field
              label="Email"
              required
              error={errors.email}
              description={editing.id ? "The email cannot be changed." : undefined}
            >
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  value={editing.email}
                  disabled={Boolean(editing.id)}
                  onChange={(event) => setEditing({ ...editing, email: event.target.value })}
                />
              )}
            </Field>
            <Field label="Role" required error={errors.roleId}>
              {(props) => (
                <Select
                  {...props}
                  value={editing.roleId}
                  onChange={(event) => setEditing({ ...editing, roleId: event.target.value })}
                >
                  {roles.data?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {editing.id ? (
              <Field label="Status" error={errors.status}>
                {(props) => (
                  <Select
                    {...props}
                    value={editing.status}
                    onChange={(event) =>
                      setEditing({ ...editing, status: event.target.value as UserForm["status"] })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled (cannot sign in)</option>
                  </Select>
                )}
              </Field>
            ) : (
              <Field
                label="Initial password"
                required
                error={errors.password}
                description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="password"
                    autoComplete="new-password"
                    value={editing.password}
                    onChange={(event) => setEditing({ ...editing, password: event.target.value })}
                  />
                )}
              </Field>
            )}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

// ── Roles ────────────────────────────────────────────────────────────────

type RoleForm = {
  id?: string;
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
};

export function RolesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const roles = useApiQuery<RoleDTO[]>("/api/admin/roles");
  const [editing, setEditing] = useState<RoleForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const body = {
      key: editing.key,
      name: editing.name,
      description: editing.description,
      permissions: editing.permissions,
    };
    const result = editing.id
      ? await apiRequest("PUT", `/api/admin/roles/${editing.id}`, body)
      : await apiRequest("POST", "/api/admin/roles", body);
    setSaving(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.error.details));
      toast.error(result.error.message);
      return;
    }
    toast.success("Role saved");
    setEditing(null);
    roles.reload();
  };

  const remove = async (role: RoleDTO) => {
    if (
      !(await confirm({
        title: `Delete the ${role.name} role?`,
        confirmLabel: "Delete role",
        tone: "danger",
      }))
    )
      return;
    const result = await apiRequest("DELETE", `/api/admin/roles/${role.id}`);
    if (!result.ok) return toast.error(result.error.message);
    toast.success("Role deleted");
    roles.reload();
  };

  return (
    <>
      <AdminPageHeader
        title="Roles"
        description="Roles group permissions. Administrator is built in and always has every permission."
        actions={
          <Button
            onClick={() => {
              setErrors({});
              setEditing({ key: "", name: "", description: "", permissions: [], isSystem: false });
            }}
          >
            <Icon icon={Plus} size={16} /> Add role
          </Button>
        }
      />
      {roles.error ? <ErrorPanel error={roles.error} onRetry={roles.reload} /> : null}
      {!roles.data && !roles.error ? <LoadingRows /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.data?.map((role) => (
          <Panel
            key={role.id}
            title={
              <span className="flex items-center gap-2">
                <Icon icon={Shield} size={16} className="text-secondary" /> {role.name}
                <span className="font-mono text-xs font-normal text-ink-3">{role.key}</span>
              </span>
            }
            description={`${role.userCount} user${role.userCount === 1 ? "" : "s"}${role.isSystem ? " · built in" : ""}`}
            actions={
              role.key === "ADMIN" ? null : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setErrors({});
                      setEditing({
                        id: role.id,
                        key: role.key,
                        name: role.name,
                        description: role.description,
                        permissions: role.permissions,
                        isSystem: role.isSystem,
                      });
                    }}
                    aria-label={`Edit ${role.name}`}
                  >
                    <Icon icon={Pencil} size={14} />
                  </Button>
                  {!role.isSystem ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void remove(role)}
                      aria-label={`Delete ${role.name}`}
                    >
                      <Icon icon={Trash2} size={14} />
                    </Button>
                  ) : null}
                </>
              )
            }
          >
            {role.description ? (
              <p className="mb-3 text-sm text-ink-2">{role.description}</p>
            ) : null}
            <ul className="space-y-1 text-sm">
              {role.permissions.map((permission) => (
                <li key={permission} className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs text-primary">{permission}</span>
                  <span className="text-ink-3">{PERMISSION_DESCRIPTIONS[permission]}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?.id ? "Edit role" : "Add role"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} pending={saving}>
              Save role
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name}>
                {(props) => (
                  <Input
                    {...props}
                    value={editing.name}
                    onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Key"
                required
                error={errors.key}
                description="Capital letters, e.g. REVIEWER."
              >
                {(props) => (
                  <Input
                    {...props}
                    value={editing.key}
                    disabled={editing.isSystem}
                    onChange={(event) =>
                      setEditing({ ...editing, key: event.target.value.toUpperCase() })
                    }
                    className="font-mono"
                  />
                )}
              </Field>
            </div>
            <Field label="Description" error={errors.description}>
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                />
              )}
            </Field>
            <fieldset className="space-y-1">
              <legend className="mb-2 text-sm font-medium text-ink">Permissions</legend>
              {ALL_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-start gap-3 rounded-xs px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={editing.permissions.includes(permission)}
                    onChange={() =>
                      setEditing({
                        ...editing,
                        permissions: editing.permissions.includes(permission)
                          ? editing.permissions.filter((item) => item !== permission)
                          : [...editing.permissions, permission],
                      })
                    }
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <span className="text-sm">
                    <span className="block font-mono text-xs text-ink">{permission}</span>
                    <span className="block text-ink-3">{PERMISSION_DESCRIPTIONS[permission]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

// ── Sessions ─────────────────────────────────────────────────────────────

export function SessionsList({ onlyMine = false }: { onlyMine?: boolean }) {
  const router = useRouter();
  const session = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const sessions = useApiQuery<SessionListItemDTO[]>("/api/admin/sessions");
  const items = (sessions.data ?? []).filter(
    (item) => !onlyMine || item.user.id === session.user.id,
  );

  const revoke = async (item: SessionListItemDTO) => {
    if (
      !(await confirm({
        title: item.current ? "Sign out of this browser?" : "End this session?",
        body: item.current ? undefined : "That device will need to sign in again.",
        confirmLabel: "End session",
      }))
    )
      return;
    const result = await apiRequest("DELETE", `/api/admin/sessions/${item.id}`);
    if (!result.ok) return toast.error(result.error.message);
    if (item.current) {
      router.replace("/admin/login");
      router.refresh();
      return;
    }
    toast.success("Session ended");
    sessions.reload();
  };

  if (sessions.error) return <ErrorPanel error={sessions.error} onRetry={sessions.reload} />;
  if (!sessions.data) return <LoadingRows rows={3} />;
  if (items.length === 0) return <EmptyPanel title="No active sessions" />;
  return (
    <ul className="divide-y divide-rule rounded-md border border-rule bg-elevated">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 text-sm">
            <p className="text-ink">
              {item.userAgent ?? "Unknown device"}
              {item.current ? (
                <span className="ml-2 text-xs text-success">This browser</span>
              ) : null}
            </p>
            <p className="text-ink-3">
              {onlyMine ? null : `${item.user.name} · `}
              Active {relativeTime(item.lastSeenAt)} · signed in {relativeTime(item.createdAt)}
              {item.ipAddress ? ` · ${item.ipAddress}` : ""}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void revoke(item)}>
            <Icon icon={LogOut} size={14} /> {item.current ? "Sign out" : "End session"}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function SessionsPage() {
  return (
    <>
      <AdminPageHeader
        title="Sessions"
        description="Everyone currently signed in. Ending a session signs that device out immediately."
      />
      <SessionsList />
    </>
  );
}

// ── Account ──────────────────────────────────────────────────────────────

export function AccountPage() {
  const session = useSession();
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const change = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.newPassword !== values.confirm) {
      setErrors({ confirm: "The passwords do not match" });
      return;
    }
    setSaving(true);
    const result = await apiRequest<{ message: string }>("POST", "/api/auth/password/change", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    setSaving(false);
    if (!result.ok) {
      setErrors(fieldErrors(result.error.details));
      toast.error(result.error.message);
      return;
    }
    setErrors({});
    setValues({ currentPassword: "", newPassword: "", confirm: "" });
    toast.success(result.data.message);
  };

  return (
    <>
      <AdminPageHeader
        title="Account"
        description={`${session.user.name} · ${session.user.email} · ${session.user.role.name}`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={
            <span className="flex items-center gap-2">
              <Icon icon={KeyRound} size={16} /> Change password
            </span>
          }
          description="Other sessions are signed out when you change it."
        >
          <form onSubmit={change} noValidate className="space-y-4">
            <Field label="Current password" required error={errors.currentPassword}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="current-password"
                  value={values.currentPassword}
                  onChange={(event) =>
                    setValues({ ...values, currentPassword: event.target.value })
                  }
                />
              )}
            </Field>
            <Field
              label="New password"
              required
              error={errors.newPassword}
              description={`At least ${PASSWORD_MIN_LENGTH} characters. A long phrase works well.`}
            >
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  value={values.newPassword}
                  onChange={(event) => setValues({ ...values, newPassword: event.target.value })}
                />
              )}
            </Field>
            <Field label="Repeat the new password" required error={errors.confirm}>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={(event) => setValues({ ...values, confirm: event.target.value })}
                />
              )}
            </Field>
            <Button type="submit" pending={saving}>
              Change password
            </Button>
          </form>
        </Panel>
        <Panel title="Your sessions" padded={false}>
          <div className="p-4">
            <SessionsList onlyMine />
          </div>
        </Panel>
      </div>
    </>
  );
}
