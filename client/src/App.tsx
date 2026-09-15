import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuthStore } from "./store/authStore";
import { useLanguageStore } from "./store/languageStore";
import { useThemeStore } from "./store/themeStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { PosPage } from "./pages/PosPage";
import { ReceiptPage } from "./pages/ReceiptPage";
import { SalesHistoryPage } from "./pages/SalesHistoryPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { DecantsPage } from "./pages/admin/DecantsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { CashUpPage } from "./pages/admin/CashUpPage";

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const lang = useLanguageStore((s) => s.lang);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <>
      <Toaster
        position="top-center"
        richColors
        theme={theme}
        dir={lang === "ar" ? "rtl" : "ltr"}
        toastOptions={{ style: { fontFamily: "inherit" } }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/receipt/:id"
          element={
            <ProtectedRoute>
              <ReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cash-up"
          element={
            <ProtectedRoute role="ADMIN">
              <CashUpPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<PosPage />} />
          <Route path="/sales/history" element={<SalesHistoryPage />} />
          <Route path="/admin/products" element={<ProtectedRoute role="ADMIN"><ProductsPage /></ProtectedRoute>} />
          <Route path="/admin/decants" element={<ProtectedRoute role="ADMIN"><DecantsPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><UsersPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute role="ADMIN"><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute role="ADMIN"><ReportsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  );
}
