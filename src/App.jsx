import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";
import RoleRoute from "./routes/RoleRoute";

import Login from "./pages/Login";
import LayoutContainer from "./layout/LayoutContainer";
import Dashboard from "./pages/Dashboard";
import SchoolManagement from "./pages/SchoolManagement";
import AuditTrails from "./pages/AuditTrails";
import TransactionHistory from "./pages/TransactionHistory";
import FinancialManagement from "./pages/FinanicalManagement";
import Reports from "./pages/Reports";
import BulkOperation from "./pages/BulkOperation";
import UserManagement from "./pages/UserManagement";
import CanteenPosSystem from "./pages/CanteenPosSystem";
import Inventory from "./pages/Inventory";
import StudentProfilePage from "./pages/StudentProfile";
import StudentTransactionsPage from "./components/student/StudentTransactionsPage";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected (logged in) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<LayoutContainer />}>

          {/* ============================
              STUDENT routes (ONLY 2 pages)
          ============================ */}
          <Route element={<RoleRoute allow={["STUDENT"]} />}>
            <Route path="/student-profile" element={<StudentProfilePage />} />
            <Route path="/student-transaction" element={<StudentTransactionsPage />} />
            {/* student default */}
            <Route index element={<Navigate to="/student-profile" replace />} />
          </Route>

          {/* ============================
              POS routes (ONLY canteen)
          ============================ */}
          <Route element={<RoleRoute allow={["ADMIN","POS"]} />}>
            <Route path="/tuck-shop-pos" element={<CanteenPosSystem />} />
            {/* pos default */}
            <Route index element={<Navigate to="/tuck-shop-pos" replace />} />
          </Route>

          {/* ============================
              ADMIN / SUPER ADMIN routes (ALL except student pages)
          ============================ */}
          <Route element={<RoleRoute allow={["ADMIN", "SUPER ADMIN"]} />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/student-management" element={<SchoolManagement />} />
            <Route path="/financial-management" element={<FinancialManagement />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/bulk-operations" element={<BulkOperation />} />
            <Route path="/audit-trails" element={<AuditTrails />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/user-management" element={<UserManagement />} />

            {/* ✅ do NOT include student-profile/student-transaction here */}
          </Route>

          {/* fallback inside layout */}
          <Route path="*" element={<div className="p-6">Not Found</div>} />
        </Route>
      </Route>

      {/* fallback global */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
