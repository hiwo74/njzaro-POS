import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, downloadFile, uploadImage } from "../../lib/api";
import type { Settings } from "../../lib/types";
import { useT } from "../../lib/i18n";

const EMPTY_SETTINGS: Settings = {
  shopName: "",
  shopAddress: "",
  receiptMessage: "",
  receiptQrUrl: "",
};

export function SettingsPage() {
  const [form, setForm] = useState<Settings>(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const t = useT();

  useEffect(() => {
    api.get<Settings>("/settings").then(setForm);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put<Settings>("/settings", form);
      setForm(updated);
      toast.success(t.settings.saved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      await downloadFile("/settings/backup", `njzaro-backup-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(t.settings.backupDownloaded);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.settings.backupFailed);
    } finally {
      setBackingUp(false);
    }
  }

  async function handleQrSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, receiptQrUrl: url }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.settings.uploadImageFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-4 pb-8 max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-brand-900">{t.settings.title}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white border border-brand-100 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1">{t.settings.shopName}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.shopName}
              onChange={(e) => setForm({ ...form, shopName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1">{t.settings.shopAddress}</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.shopAddress}
              onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white border border-brand-100 rounded-xl p-4 space-y-3">
          <h2 className="font-medium text-brand-900">{t.settings.receiptCustomization}</h2>

          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1">{t.settings.closingMessage}</label>
            <textarea
              rows={2}
              className="w-full border rounded-lg px-3 py-2 resize-none"
              placeholder={t.receipt.defaultThanks}
              value={form.receiptMessage}
              onChange={(e) => setForm({ ...form, receiptMessage: e.target.value })}
            />
            <p className="text-xs text-brand-400 mt-1">{t.settings.closingMessageHint}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-900 mb-1">{t.settings.qrCodeLabel}</label>
            <div className="flex items-center gap-3">
              {form.receiptQrUrl ? (
                <img src={form.receiptQrUrl} alt={t.receipt.qrAlt} className="w-16 h-16 rounded-lg border border-brand-100 object-contain bg-white" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-dashed border-brand-200 flex items-center justify-center text-xs text-brand-400 text-center px-1">
                  {t.settings.noCode}
                </div>
              )}
              <div>
                <label className="press inline-block px-3 py-1.5 border border-brand-200 rounded-lg text-sm text-brand-900 cursor-pointer hover:bg-brand-50">
                  {uploading ? t.products.uploading : form.receiptQrUrl ? t.common.change : t.settings.uploadQrCode}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleQrSelect} disabled={uploading} />
                </label>
                {form.receiptQrUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, receiptQrUrl: "" }))}
                    className="press ms-2 text-sm text-red-600 underline"
                  >
                    {t.common.remove}
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-brand-400 mt-2">
              {t.settings.qrHint}
            </p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="press px-4 py-2 bg-brand-500 text-white rounded-lg font-medium disabled:opacity-60">
          {saving ? t.settings.saving : t.settings.saveSettings}
        </button>
      </form>

      <div className="bg-white border border-brand-100 rounded-xl p-4 space-y-2">
        <h2 className="font-medium text-brand-900">{t.settings.backupTitle}</h2>
        <p className="text-xs text-brand-400">
          {t.settings.backupHint}
        </p>
        <button
          type="button"
          onClick={handleBackup}
          disabled={backingUp}
          className="press px-4 py-2 border border-brand-200 rounded-lg text-sm font-medium text-brand-900 disabled:opacity-60"
        >
          {backingUp ? t.settings.preparingBackup : t.settings.downloadBackup}
        </button>
      </div>
    </div>
  );
}
