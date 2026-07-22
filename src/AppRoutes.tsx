// src/AppRoutes.tsx
import VendorDeliverySettingsPage from "./pages/vendor/VendorDeliverySettingsPage";
import AdminWhatsappTemplatesPage from "./pages/admin/AdminWhatsappTemplatesPage";
import AdminWhatsappLogsPage from "./pages/admin/AdminWhatsappLogsPage"; // 🆕 v13
import VendorOnboardingPage from "./pages/vendor/VendorOnboardingPage";
import SupplierRegisterPage from "./pages/SupplierRegisterPage"; // 🆕 v13 - Registro proveedor
import { Routes, Route } from "react-router-dom";
import AdminSupplierPayoutsPage from "./pages/admin/AdminSupplierPayoutsPage"; // 🆕 v19

import ProtectedRoute from "./components/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StorePage from "./pages/StorePage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import NotFoundPage from "./pages/NotFoundPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminThemePage from "./pages/admin/AdminThemePage";
import AdminCatalogPage from "./pages/admin/AdminCatalogPage";
import AdminSuppliersPage from "./pages/admin/AdminSuppliersPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminStoresPage from "./pages/admin/AdminStoresPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPaymentMethodsPage from "./pages/admin/AdminPaymentMethodsPage";
import AdminDeliveriesPage from "./pages/admin/AdminDeliveriesPage";
import AdminDeliveryPaymentsPage from "./pages/admin/AdminDeliveryPaymentsPage";
import AdminWhatsappPage from "./pages/admin/AdminWhatsappPage"; // 🆕 FASE 5B
import { PaymentValidationsPage } from "./pages/admin/PaymentValidationsPage"; // 🆕 v16 - OCR

import VendorLayout from "./layouts/VendorLayout";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorCatalogPage from "./pages/vendor/VendorCatalogPage";
import VendorProductsPage from "./pages/vendor/VendorProductsPage";
import VendorOrdersPage from "./pages/vendor/VendorOrdersPage";
import VendorPaymentsPage from "./pages/vendor/VendorPaymentsPage";
import VendorThemePage from "./pages/vendor/VendorThemePage";
import VendorSettingsPage from "./pages/vendor/VendorSettingsPage";
import VendorReviewsPage from "./pages/vendor/VendorReviewsPage";
import VendorAnalyticsPage from "./pages/vendor/VendorAnalyticsPage";
import VendorPickupLocationsPage from "./pages/vendor/VendorPickupLocationsPage"; // 🆕 v13

import CustomerLayout from "./layouts/CustomerLayout";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerOrdersPage from "./pages/customer/CustomerOrdersPage";
import CustomerFavoritesPage from "./pages/customer/CustomerFavoritesPage";
import CustomerAddressesPage from "./pages/customer/CustomerAddressesPage";

// 🛵 Delivery
import DeliveryLayout from "./layouts/DeliveryLayout";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";
import DeliveryOrdersPage from "./pages/delivery/DeliveryOrdersPage";
import DeliveryOrderDetailPage from "./pages/delivery/DeliveryOrderDetailPage";
import DeliveryEarningsPage from "./pages/delivery/DeliveryEarningsPage";
import DeliveryProfilePage from "./pages/delivery/DeliveryProfilePage";

// 🏭 Supplier (proveedor mayorista) - 🆕 v13
import SupplierLayout from "./layouts/SupplierLayout";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierProfilePage from "./pages/supplier/SupplierProfilePage";
import SupplierProductsPage from "./pages/supplier/SupplierProductsPage";
import SupplierOrdersPage from "./pages/supplier/SupplierOrdersPage";
import SupplierEarningsPage from "./pages/supplier/SupplierEarningsPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/crear-tienda" element={<VendorOnboardingPage />} />
      <Route path="/registro-proveedor" element={<SupplierRegisterPage />} /> {/* 🆕 v13 */}

      {/* Tienda pública */}
      <Route path="/tienda/:slug" element={<StorePage />} />
      <Route path="/store/:slug" element={<StorePage />} />

      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/order-success" element={<OrderSuccessPage />} />

      {/* Tracking público */}
      <Route path="/pedido/:orderNumber" element={<OrderTrackingPage />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="theme" element={<AdminThemePage />} />
        <Route path="catalog" element={<AdminCatalogPage />} />
        <Route path="suppliers" element={<AdminSuppliersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="deliveries" element={<AdminDeliveriesPage />} />
        <Route path="delivery-payments" element={<AdminDeliveryPaymentsPage />} />
        <Route path="delivery-payments" element={<AdminDeliveryPaymentsPage />} />
<Route path="supplier-payouts" element={<AdminSupplierPayoutsPage />} /> {/* 🆕 v19 */}
        <Route path="stores" element={<AdminStoresPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="payments" element={<AdminPaymentMethodsPage />} />
        <Route path="payment-validations" element={<PaymentValidationsPage />} /> {/* 🆕 v16 - OCR */}
        <Route path="whatsapp" element={<AdminWhatsappPage />} /> {/* 🆕 FASE 5B */}
        <Route path="whatsapp-templates" element={<AdminWhatsappTemplatesPage />} /> {/* 🆕 FASE 5B Etapa 4 */}
        <Route path="whatsapp-logs" element={<AdminWhatsappLogsPage />} /> {/* 🆕 v13 */}
      </Route>

      {/* Vendor */}
      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={["vendor"]}>
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VendorDashboard />} />
        <Route path="delivery-settings" element={<VendorDeliverySettingsPage />} />
        <Route path="catalog" element={<VendorCatalogPage />} />
        <Route path="products" element={<VendorProductsPage />} />
        <Route path="orders" element={<VendorOrdersPage />} />
        <Route path="reviews" element={<VendorReviewsPage />} />
        <Route path="analytics" element={<VendorAnalyticsPage />} />
        <Route path="pickup-locations" element={<VendorPickupLocationsPage />} /> {/* 🆕 v13 */}
        <Route path="payments" element={<VendorPaymentsPage />} />
        <Route path="theme" element={<VendorThemePage />} />
        <Route path="settings" element={<VendorSettingsPage />} />
      </Route>

      {/* Customer */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrdersPage />} />
        <Route path="favorites" element={<CustomerFavoritesPage />} />
        <Route path="addresses" element={<CustomerAddressesPage />} />
      </Route>

      {/* 🛵 Delivery */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={["delivery"]}>
            <DeliveryLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DeliveryDashboard />} />
        <Route path="orders" element={<DeliveryOrdersPage />} />
        <Route path="orders/:id" element={<DeliveryOrderDetailPage />} />
        <Route path="earnings" element={<DeliveryEarningsPage />} />
        <Route path="profile" element={<DeliveryProfilePage />} />
      </Route>

      {/* 🏭 Supplier - 🆕 v13 */}
      <Route
        path="/supplier"
        element={
          <ProtectedRoute allowedRoles={["supplier"]}>
            <SupplierLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SupplierDashboard />} />
        <Route path="orders" element={<SupplierOrdersPage />} />
        <Route path="products" element={<SupplierProductsPage />} />
        <Route path="earnings" element={<SupplierEarningsPage />} />
        <Route path="profile" element={<SupplierProfilePage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}