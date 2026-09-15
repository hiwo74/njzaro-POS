import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../lib/types";

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, checked } = useAuthStore();

  if (!checked) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return <>{children}</>;
}
