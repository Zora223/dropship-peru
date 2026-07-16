// src/pages/admin/AdminWhatsappTemplatesPage.tsx
// Panel de gestión de templates de WhatsApp

import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getTemplates,
  updateTemplate,
  extractVariables,
  renderPreview,
  sendTestMessage,
  type WhatsappTemplate,
} from "../../lib/whatsapp-templates";

// Valores de ejemplo para el preview
const DEFAULT_VARIABLES: Record<string, string> = {
  customer_name: "Marco Peña",
  customer_phone: "51916146396",
  vendor_name: "Roberto Lozano",
  vendor_phone: "51987654321",
  delivery_name: "Olga Ramírez",
  delivery_phone: "51916146396",
  order_number: "DP-2026-0042",
  total: "89.00",
  payment_method: "Yape",
  items_summary: "1x Polo Deportivo, 2x Gorra Casual",
  store_name: "Infinity Shop",
  shipping_address: "Av. Javier Prado 1234, San Isidro, Lima",
  tracking_url: "https://dropshipperu.com/tracking/DP-2026-0042",
  vendor_earnings: "65.00",
  delivery_earnings: "6.00",
  platform_fee: "18.00",
};

// Colores según recipient
const RECIPIENT_STYLES: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  customer: { bg: "bg-rose-50", text: "text-rose-700", label: "Cliente", emoji: "🛍️" },
  vendor: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Vendedor", emoji: "🏪" },
  delivery: { bg: "bg-blue-50", text: "text-blue-700", label: "Delivery", emoji: "🛵" },
};

export default function AdminWhatsappTemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WhatsappTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Estado del formulario de edición
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formActive, setFormActive] = useState(true);

  // Cargar templates
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error("Error", "No se pudieron cargar los templates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Abrir modal de edición
  const openEdit = (template: WhatsappTemplate) => {
    setEditing(template);
    setFormTitle(template.title);
    setFormDescription(template.description || "");
    setFormMessage(template.message_template);
    setFormActive(template.active);
  };

  // Cerrar modal
  const closeEdit = () => {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormMessage("");
    setFormActive(true);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateTemplate(editing.id, {
        title: formTitle,
        description: formDescription,
        message_template: formMessage,
        active: formActive,
      });
      toast.success("Guardado", "Template actualizado correctamente");
      await loadTemplates();
      closeEdit();
    } catch (error) {
      toast.error("Error", "No se pudo guardar el template");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle activo directo desde la card
  const toggleActive = async (template: WhatsappTemplate) => {
    try {
      await updateTemplate(template.id, { active: !template.active });
      toast.success(
        template.active ? "Desactivado" : "Activado",
        `Template ${template.active ? "desactivado" : "activado"}`
      );
      await loadTemplates();
    } catch (error) {
      toast.error("Error", "No se pudo cambiar el estado");
      console.error(error);
    }
  };

  // Enviar prueba
  const handleSendTest = async () => {
    if (!editing) return;
    setSending(true);
    try {
      const variables = extractVariables(formMessage).reduce((acc, key) => {
        acc[key] = DEFAULT_VARIABLES[key] || `[${key}]`;
        return acc;
      }, {} as Record<string, string>);

      // Asegurar que customer_phone esté presente para que llegue
      if (!variables.customer_phone) {
        variables.customer_phone = "51916146396";
      }

      const result = await sendTestMessage(editing.event_key, variables);
      if (result.success) {
        toast.success("Enviado ✅", "Mensaje de prueba enviado al 916146396");
      } else {
        toast.error("Error", result.error || "No se pudo enviar");
      }
    } catch (error) {
      toast.error("Error", "Falló el envío");
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  // Insertar variable en el cursor
  const insertVariable = (variable: string) => {
    setFormMessage((prev) => prev + `{{${variable}}}`);
  };

  // Agrupar por recipient
  const grouped = templates.reduce((acc, t) => {
    if (!acc[t.recipient]) acc[t.recipient] = [];
    acc[t.recipient].push(t);
    return acc;
  }, {} as Record<string, WhatsappTemplate[]>);

  // Variables detectadas en el formulario de edición
  const detectedVars = editing ? extractVariables(formMessage) : [];

  // Preview del mensaje
  const preview = editing
    ? renderPreview(
        formMessage,
        detectedVars.reduce((acc, key) => {
          acc[key] = DEFAULT_VARIABLES[key] || `[${key}]`;
          return acc;
        }, {} as Record<string, string>)
      )
    : "";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📱 Templates de WhatsApp</h1>
        <p className="text-gray-600 mt-2">
          Personaliza los mensajes automáticos que se envían a clientes, vendedores y delivery.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando templates...</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([recipient, list]) => {
            const style = RECIPIENT_STYLES[recipient] || RECIPIENT_STYLES.customer;
            return (
              <div key={recipient}>
                {/* Título del grupo */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${style.bg} ${style.text} font-semibold mb-4`}>
                  <span className="text-lg">{style.emoji}</span>
                  <span>Mensajes para {style.label}</span>
                  <span className="opacity-60">({list.length})</span>
                </div>

                {/* Grid de templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {list.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{template.title}</h3>
                          <code className="text-xs text-gray-400">{template.event_key}</code>
                        </div>
                        {/* Toggle activo */}
                        <button
                          onClick={() => toggleActive(template)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            template.active ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              template.active ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {template.description && (
                        <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                      )}

                      {/* Preview del mensaje (primeras líneas) */}
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 mb-3 line-clamp-3 whitespace-pre-wrap">
                        {template.message_template}
                      </div>

                      {/* Variables detectadas */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {extractVariables(template.message_template).slice(0, 4).map((v) => (
                          <span key={v} className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                            {`{{${v}}}`}
                          </span>
                        ))}
                        {extractVariables(template.message_template).length > 4 && (
                          <span className="text-xs px-2 py-1 text-gray-400">
                            +{extractVariables(template.message_template).length - 4} más
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => openEdit(template)}
                        className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-lg transition-colors"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edición */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header modal */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Editar Template</h2>
                <code className="text-xs text-gray-400">{editing.event_key}</code>
              </div>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Body modal — split 2 columnas */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Columna izquierda — Editor */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="¿Cuándo se envía este mensaje?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensaje (usa {`{{variable}}`} para insertar datos)
                  </label>
                  <textarea
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    rows={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-transparent font-mono text-sm"
                  />
                </div>

                {/* Variables disponibles para insertar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variables disponibles (click para insertar)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(DEFAULT_VARIABLES).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          detectedVars.includes(v)
                            ? "bg-rose-50 border-rose-300 text-rose-700"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle activo */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setFormActive(!formActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      formActive ? "bg-emerald-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">
                    Template {formActive ? "activo" : "inactivo"}
                  </span>
                </div>
              </div>

              {/* Columna derecha — Preview */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👁️ Vista previa (con datos de ejemplo)
                  </label>
                  <div className="bg-linear-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 shadow-inner min-h-100">
                    <div className="bg-white rounded-xl p-4 shadow-sm whitespace-pre-wrap text-sm text-gray-800">
                      {preview || "Escribe un mensaje para ver el preview..."}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">💡 Tip</p>
                  <p>
                    Las variables se reemplazan automáticamente cuando se envía el mensaje real.
                    El botón "Enviar prueba" te enviará este mensaje al{" "}
                    <strong>916146396</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer modal */}
            <div className="p-6 border-t border-gray-200 flex justify-between items-center gap-3">
              <button
                onClick={handleSendTest}
                disabled={sending || !formMessage}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                {sending ? "Enviando..." : "🧪 Enviar prueba a mi WA"}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={closeEdit}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                >
                  {saving ? "Guardando..." : "💾 Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}