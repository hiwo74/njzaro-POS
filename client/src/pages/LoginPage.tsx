import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { ApiError } from "../lib/api";
import { BottleIcon } from "../components/Icons";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { useT } from "../lib/i18n";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const navigate = useNavigate();
  const t = useT();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.login.loginFailed);
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4 pt-safe pb-safe">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="bg-surface shadow-lg rounded-2xl p-8 w-full max-w-sm border border-brand-100"
      >
        <div className="flex justify-center items-center gap-2 mb-4">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center mx-auto mb-3">
            <BottleIcon className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900 tracking-wide">NJZARO</h1>
          <p className="text-sm text-brand-900">{t.login.subtitle}</p>
        </div>

        <label className="block text-sm font-medium text-brand-900 mb-1">{t.login.username}</label>
        <input
          className="w-full border border-brand-100 rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="block text-sm font-medium text-brand-900 mb-1">{t.login.password}</label>
        <input
          type="password"
          className="w-full border border-brand-100 rounded-lg px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="press w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg py-3 disabled:opacity-60"
        >
          {loading ? t.login.signingIn : t.login.signIn}
        </button>

        <p className="text-xs text-center text-brand-900 mt-4">
          {t.login.defaultAdminNote}
        </p>
      </motion.form>
    </div>
  );
}
