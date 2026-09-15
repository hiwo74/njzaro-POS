import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import type { Product } from "../lib/types";
import { useT } from "../lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BottleIcon, CartIcon, ChartIcon, MenuIcon, PowerIcon, ReceiptIcon, SettingsIcon, UserIcon } from "./Icons";

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `press px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
    isActive ? "bg-brand-500 text-white" : "text-brand-900 hover:bg-brand-100"
  }`;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-brand-900 ${className}`}>
      <BottleIcon className="w-5 h-5" />
      <span className="tracking-wide">NJZARO</span>
    </span>
  );
}

function TabBarLink({ to, label, icon, end }: { to: string; label: string; icon: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `press flex flex-col items-center justify-center gap-1 flex-1 h-full text-[11px] font-medium transition-colors duration-200 ${
          isActive ? "text-brand-900" : "text-brand-400"
        }`
      }
    >
      <span className="w-5 h-5">{icon}</span>
      {label}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const t = useT();

  const ADMIN_MORE_LINKS = [
    { to: "/admin/products", label: t.nav.products, icon: <BottleIcon /> },
    { to: "/admin/users", label: t.nav.users, icon: <UserIcon /> },
    { to: "/admin/settings", label: t.nav.settings, icon: <SettingsIcon /> },
  ];

  async function handleLogout() {
    setMoreOpen(false);
    await logout();
    navigate("/login");
  }

  const isAdmin = user?.role === "ADMIN";
  const onMoreSection = ADMIN_MORE_LINKS.some((l) => location.pathname.startsWith(l.to));

  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ lowStock: Product[] }>("/reports/low-stock").then(({ lowStock }) => {
      if (lowStock.length === 0) return;
      const names = lowStock.slice(0, 3).map((p) => p.name).join(", ");
      const more = lowStock.length > 3 ? t.nav.lowStockToastMore(lowStock.length - 3) : "";
      toast.warning(t.nav.lowStockToastTitle(lowStock.length), {
        description: `${names}${more}`,
        action: { label: t.nav.viewAction, onClick: () => navigate("/admin/reports") },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">
      {/* Desktop header */}
      <header className="no-print hidden lg:flex sticky top-0 z-30 items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2">
          <Logo />
          <nav className="flex items-center gap-1 ms-4">
            <NavLink to="/" className={desktopLinkClass} end>
              {t.nav.checkout}
            </NavLink>
            <NavLink to="/sales/history" className={desktopLinkClass}>
              {t.nav.salesHistory}
            </NavLink>
            {isAdmin && (
              <>
                <NavLink to="/admin/reports" className={desktopLinkClass}>
                  {t.nav.reports}
                </NavLink>
                <NavLink to="/admin/products" className={desktopLinkClass}>
                  {t.nav.products}
                </NavLink>
                <NavLink to="/admin/users" className={desktopLinkClass}>
                  {t.nav.users}
                </NavLink>
                <NavLink to="/admin/settings" className={desktopLinkClass}>
                  {t.nav.settings}
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          <span className="text-brand-900">
            {user?.name} <span className="text-brand-500">({user?.role === "ADMIN" ? t.nav.roleAdmin : t.nav.roleCashier})</span>
          </span>
          <button
            onClick={handleLogout}
            className="press px-3 py-1.5 rounded-lg border border-brand-200 text-brand-900 hover:bg-brand-100 transition-colors duration-200"
          >
            {t.nav.logOut}
          </button>
        </div>
      </header>

      {/* Mobile header */}
      <header className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 pt-safe bg-white/80 backdrop-blur-xl border-b border-black/5">
        <Logo className="text-sm" />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            aria-label={t.nav.logOut}
            className="press w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 text-brand-900"
          >
            <PowerIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-[calc(64px+var(--safe-bottom))] lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 flex h-16 pb-safe bg-white/85 backdrop-blur-xl border-t border-black/5">
        <TabBarLink to="/" end label={t.nav.checkout} icon={<CartIcon />} />
        <TabBarLink to="/sales/history" label={t.nav.history} icon={<ReceiptIcon />} />
        {isAdmin && (
          <>
            <TabBarLink to="/admin/reports" label={t.nav.reports} icon={<ChartIcon />} />
            <button
              onClick={() => setMoreOpen(true)}
              className={`press flex flex-col items-center justify-center gap-1 flex-1 h-full text-[11px] font-medium transition-colors duration-200 ${
                onMoreSection ? "text-brand-900" : "text-brand-400"
              }`}
            >
              <span className="w-5 h-5"><MenuIcon /></span>
              {t.nav.more}
            </button>
          </>
        )}
      </nav>

      {/* "More" sheet for admin-only sections on mobile */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-2xl pb-safe shadow-xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-brand-100" />
              <div className="p-4 space-y-1">
                {ADMIN_MORE_LINKS.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `press flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                        isActive ? "bg-brand-100 text-brand-900" : "text-brand-900"
                      }`
                    }
                  >
                    <span className="w-5 h-5">{l.icon}</span>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
