import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import type { Role, User } from "../../lib/types";
import { useT } from "../../lib/i18n";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CASHIER");
  const [saving, setSaving] = useState(false);
  const t = useT();

  async function load() {
    setUsers(await api.get<User[]>("/users"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", { username, password, name, role });
      toast.success(t.users.userCreated(username));
      setUsername("");
      setPassword("");
      setName("");
      setRole("CASHIER");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.users.createFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      toast.success(u.active ? t.users.deactivatedName(u.name) : t.users.reactivatedName(u.name));
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.users.updateFailed);
    }
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold text-brand-900 mb-4">{t.users.title}</h1>

      <form onSubmit={handleCreate} className="bg-surface border border-brand-100 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input required placeholder={t.users.usernamePlaceholder} className="border rounded-lg px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input required type="password" placeholder={t.users.passwordPlaceholder} className="border rounded-lg px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input required placeholder={t.users.fullNamePlaceholder} className="border rounded-lg px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="border rounded-lg px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="CASHIER">{t.users.roleCashierOption}</option>
          <option value="ADMIN">{t.users.roleAdminOption}</option>
        </select>
        <button type="submit" disabled={saving} className="press px-4 py-2 bg-brand-500 text-white rounded-lg font-medium disabled:opacity-60">
          {saving ? t.users.adding : t.users.addUser}
        </button>
      </form>

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-2">
        {users.map((u) => (
          <div key={u.id} className="bg-surface rounded-xl border border-brand-100 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-brand-900">{u.name}</div>
              <div className="text-xs text-brand-900">
                @{u.username} · {u.role === "ADMIN" ? t.users.roleAdminOption : t.users.roleCashierOption} ·{" "}
                {u.active ? <span className="text-green-700">{t.common.active}</span> : <span className="text-gray-400">{t.common.inactive}</span>}
              </div>
            </div>
            <button onClick={() => toggleActive(u)} className="press text-sm text-brand-900 font-medium">
              {u.active ? t.users.deactivate : t.users.reactivate}
            </button>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block bg-surface rounded-xl border border-brand-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-brand-900 border-b border-brand-100">
              <th className="p-3">{t.users.colUsername}</th>
              <th className="p-3">{t.users.colName}</th>
              <th className="p-3">{t.users.colRole}</th>
              <th className="p-3">{t.users.colStatus}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-brand-50">
                <td className="p-3">{u.username}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.role === "ADMIN" ? t.users.roleAdminOption : t.users.roleCashierOption}</td>
                <td className="p-3">{u.active ? <span className="text-green-700">{t.common.active}</span> : <span className="text-gray-400">{t.common.inactive}</span>}</td>
                <td className="p-3">
                  <button onClick={() => toggleActive(u)} className="press text-brand-900 underline">
                    {u.active ? t.users.deactivate : t.users.reactivate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
