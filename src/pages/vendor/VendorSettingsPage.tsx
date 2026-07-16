import { useEffect, useState } from "react";
import { useMyStore } from "../../hooks/useMyStore";
import {
  createMyStore,
  updateMyStore,
  updateStoreLogo,
  isSlugAvailable,
} from "../../lib/vendor-store";

// Convierte un texto a slug-friendly (lowercase, sin tildes, guiones)
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function VendorSettingsPage() {
  const { store, loading, reload } = useMyStore();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    instagram: "",
    facebook: "",
    whatsapp: "",
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Cuando carga la tienda, llenamos el formulario
  useEffect(() => {
    if (store) {
      setForm({
        name: store.name,
        slug: store.slug,
        description: store.description ?? "",
        contact_email: store.contact_email ?? "",
        contact_phone: store.contact_phone ?? "",
        instagram: store.instagram ?? "",
        facebook: store.facebook ?? "",
        whatsapp: store.whatsapp ?? "",
      });
      setAutoSlug(false);
      setLogoPreview(store.logo_url);
    }
  }, [store]);

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: autoSlug ? toSlug(value) : prev.slug,
    }));
    setSaved(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "slug") {
      setForm((prev) => ({ ...prev, slug: toSlug(value) }));
      setAutoSlug(false);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validar slug
      if (!form.slug) {
        throw new Error("La URL no puede estar vacía");
      }
      const slugFree = await isSlugAvailable(form.slug, store?.id);
      if (!slugFree) {
        throw new Error("Esa URL ya está siendo usada por otra tienda. Elige otra.");
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
      };

      let storeId: string;

      if (store) {
        await updateMyStore(store.id, payload);
        storeId = store.id;
      } else {
        const newStore = await createMyStore(payload);
        storeId = newStore.id;
      }

      // Subir logo si hay uno nuevo
      if (logoFile) {
        await updateStoreLogo(storeId, logoFile);
        setLogoFile(null);
      }

      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!store) return;
    const url = `${window.location.origin}/tienda/${store.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-rose-500" />
      </div>
    );
  }

  const storeUrl = store ? `${window.location.origin}/tienda/${store.slug}` : "";
  const isCreating = !store;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {isCreating ? "Crea tu tienda" : "Configuración de tienda"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isCreating
            ? "Configura los datos básicos para empezar a vender."
            : "Personaliza tu marca y comparte tu link único."}
        </p>
      </div>

      {/* Link compartible (solo si ya existe la tienda) */}
      {store && (
        <div className="overflow-hidden rounded-3xl bg-linear-to-br from-gray-900 via-rose-900 to-rose-700 p-6 text-white shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider opacity-80">🔗 Tu link de tienda</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="-grow rounded-xl bg-white/10 px-4 py-3 font-mono text-sm backdrop-blur">
              {storeUrl}
            </div>
            <button
              onClick={copyLink}
              className={`shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition ${
                copiedLink ? "bg-emerald-500 text-white" : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
            >
              {copiedLink ? "✓ Copiado" : "Copiar link"}
            </button>
          </div>
          <p className="mt-3 text-xs opacity-80">
            Comparte este link en WhatsApp, Instagram, Facebook o donde tu audiencia esté.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Identidad */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Identidad de marca</h2>

            <div className="mt-6 flex items-start gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Logo</label>
                <label className="mt-2 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-rose-500 hover:bg-rose-50/30">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl text-gray-400">+</div>
                      <div className="mt-1 text-[10px] font-semibold text-gray-500">Subir</div>
                    </div>
                  )}
                </label>
              </div>

              <div className="-grow space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Nombre de la tienda</label>
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                    placeholder="Ej: TechPerú"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700">URL de tu tienda</label>
                  <div className="mt-1.5 flex items-center rounded-xl border border-gray-200 bg-gray-50 transition focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20">
                    <span className="pl-4 text-sm text-gray-400">/tienda/</span>
                    <input
                      name="slug"
                      required
                      value={form.slug}
                      onChange={handleChange}
                      className="w-full rounded-xl bg-transparent py-2.5 pl-1 pr-4 text-sm outline-none"
                      placeholder="mi-tienda"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Solo letras minúsculas, números y guiones.</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700">Descripción</label>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                placeholder="Cuenta a tus clientes qué te hace único..."
              />
            </div>
          </div>

          {/* Contacto */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Datos de contacto</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Correo</label>
                <input
                  name="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">Teléfono</label>
                <input
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>
          </div>

          {/* Redes */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Redes sociales</h2>
            <p className="mt-1 text-xs text-gray-500">Aparecerán en tu tienda para que los clientes te sigan.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">📷 Instagram (usuario)</label>
                <input
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  placeholder="techperu"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">📘 Facebook (página)</label>
                <input
                  name="facebook"
                  value={form.facebook}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  placeholder="techperuoficial"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">💬 WhatsApp (con código país)</label>
                <input
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                  placeholder="+51987654321"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">Vista previa</h2>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                <div className="bg-linear-to-br from-rose-500 via-pink-500 to-orange-500 p-6 text-center text-white">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-white/30" />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl backdrop-blur">
                      🏪
                    </div>
                  )}
                  <div className="mt-3 text-base font-bold">{form.name || "Mi tienda"}</div>
                  <div className="mt-1 text-xs opacity-90 line-clamp-2">{form.description || "Tu descripción aparecerá aquí"}</div>
                </div>
              </div>

              {store && (
                <a
                  href={`/tienda/${store.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block rounded-xl border border-gray-200 py-2.5 text-center text-xs font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                >
                  Ver tienda real →
                </a>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`w-full rounded-2xl py-4 text-sm font-bold shadow-lg transition ${
                saved ? "bg-emerald-500 text-white" : "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
              }`}
            >
              {saving ? "Guardando..." : saved ? "✓ Cambios guardados" : isCreating ? "Crear mi tienda" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}