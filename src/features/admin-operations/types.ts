export type UserRecord = {
  id: string;
  email: string;
  display_name: string;
  employee_code: string | null;
  role: "hr_admin" | "employee";
  office: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
};
