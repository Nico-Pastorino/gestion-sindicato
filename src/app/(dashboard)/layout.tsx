import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // El proxy ya redirige, pero el layout no debe confiar solo en él.
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: session.user.name ?? "Usuario",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
