import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user?.token) return <Navigate to="/" replace />;
  return children;
}
