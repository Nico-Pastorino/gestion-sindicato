import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/services/users.service";
import { UsersClient } from "./users-client";

export const metadata: Metadata = { title: "Usuarios" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Usuarios
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Cuentas con acceso al sistema y sus permisos.
        </p>
      </div>

      <UsersClient
        initialUsers={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
