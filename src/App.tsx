import MainLayout from "./layouts/MainLayout";
import AppRoutes from "./AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { PlatformSettingsProvider } from "./contexts/PlatformSettingsContext";
import PlatformBanner from "./components/PlatformBanner";
import SeasonalEffect from "./components/SeasonalEffect";

function App() {
  return (
    <PlatformSettingsProvider>
      <AuthProvider>
        <CartProvider>
          {/* Banner promocional global (encima de todo) */}
          <PlatformBanner />

          <MainLayout>
            <AppRoutes />
          </MainLayout>

          {/* Efecto animado global (nieve, confetti, etc.) */}
          <SeasonalEffect />
        </CartProvider>
      </AuthProvider>
    </PlatformSettingsProvider>
  );
}

export default App;