import { requireRole } from "@/features/auth/session";
import { getAllUsers } from "@/features/admin-operations/user-actions";
import { UserManagementView } from "@/features/admin-operations/user-management-view";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const profile = await requireRole("hr_admin");
  const users = await getAllUsers();

  return <UserManagementView initialUsers={users} currentAdminId={profile.id} />;
}
