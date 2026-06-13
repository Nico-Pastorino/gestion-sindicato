"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, KeyRound, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UserRole } from "@/types/next-auth";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  readonly: "Solo lectura",
};

const ROLE_BADGES: Record<UserRole, string> = {
  admin: "badge-finished",
  operator: "badge-active",
  readonly: "badge-inactive",
};

export function UsersClient({
  initialUsers,
  currentUserId,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              onDone={() => {
                setCreateOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[hsl(var(--muted-foreground))] text-xs uppercase tracking-wide">
                <th className="text-left py-2.5 px-4 font-semibold">Nombre</th>
                <th className="text-left py-2.5 px-3 font-semibold hidden sm:table-cell">Email</th>
                <th className="text-left py-2.5 px-3 font-semibold">Rol</th>
                <th className="py-2.5 px-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialUsers.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  onChanged={() => router.refresh()}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        <strong>Administrador:</strong> acceso total, incluida la gestión de usuarios.{" "}
        <strong>Operador:</strong> carga afiliados, beneficios y cobranzas.{" "}
        <strong>Solo lectura:</strong> consulta sin modificar datos.
      </p>
    </div>
  );
}

// ─── Fila con acciones ────────────────────────────────────────────────────────

function UserTableRow({
  user,
  isSelf,
  onChanged,
}: {
  user: UserRow;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  async function handleRoleChange(role: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Error al actualizar rol");
      toast.success(`Rol de ${user.name} actualizado`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar rol");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar el usuario ${user.name}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Error al eliminar usuario");
      toast.success(`Usuario ${user.name} eliminado`);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar usuario");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="hover:bg-[hsl(var(--accent))]/40 transition-colors">
      <td className="py-2.5 px-4 font-medium">
        {user.name}
        {isSelf && (
          <span className="ml-2 text-xs font-normal text-[hsl(var(--muted-foreground))]">(vos)</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))] hidden sm:table-cell">
        {user.email}
      </td>
      <td className="py-2.5 px-3">
        {isSelf ? (
          <span className={ROLE_BADGES[user.role]}>{ROLE_LABELS[user.role]}</span>
        ) : (
          <select
            value={user.role}
            disabled={busy}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs font-medium"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}
      </td>
      <td className="py-2.5 px-4">
        <div className="flex items-center justify-end gap-1">
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={busy} title="Restablecer contraseña">
                <KeyRound className="h-4 w-4" />
                <span className="hidden md:inline">Contraseña</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Restablecer contraseña de {user.name}</DialogTitle>
              </DialogHeader>
              <ResetPasswordForm
                userId={user.id}
                onDone={() => {
                  setResetOpen(false);
                  onChanged();
                }}
              />
            </DialogContent>
          </Dialog>
          {!isSelf && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
              title="Eliminar usuario"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Crear usuario ────────────────────────────────────────────────────────────

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: form.get("role"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Error al crear usuario");
      toast.success("Usuario creado correctamente");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-name">Nombre completo</Label>
        <Input id="new-name" name="name" required minLength={2} placeholder="Juan Pérez" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-email">Email</Label>
        <Input id="new-email" name="email" type="email" required placeholder="juan@sindicato.org" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">Contraseña</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-role">Rol</Label>
        <select
          id="new-role"
          name="role"
          defaultValue="operator"
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear usuario"}
      </Button>
    </form>
  );
}

// ─── Restablecer contraseña ───────────────────────────────────────────────────

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Error al restablecer contraseña");
      toast.success("Contraseña actualizada");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reset-password">Nueva contraseña</Label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar contraseña"}
      </Button>
    </form>
  );
}
