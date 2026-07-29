import { useState, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import type { PickupLocation } from '../../lib/pickup-locations';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: '16px',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy' as const, // Móvil: 1 dedo puede mover el mapa
};

const CITY_CENTERS = {
  iquitos: { lat: -3.7437, lng: -73.2516 },
  lima: { lat: -12.0464, lng: -77.0428 },
};

interface Props {
  locations: PickupLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  primaryColor?: string;
}

export default function PickupLocationsMap({
  locations,
  selectedId,
  onSelect,
  primaryColor = '#e11d48',
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    language: 'es',
    region: 'PE',
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);

  // Solo puntos con coordenadas
  const locationsWithCoords = useMemo(
    () => locations.filter((l) => l.latitude && l.longitude),
    [locations]
  );

  // Detectar ciudad para centrar el mapa
  const defaultCenter = useMemo(() => {
    const firstCity = locations[0]?.city?.toLowerCase() || '';
    return firstCity.includes('lima') ? CITY_CENTERS.lima : CITY_CENTERS.iquitos;
  }, [locations]);

  // Centro inicial: primer punto con GPS, o centro de ciudad
  const initialCenter = useMemo(() => {
    if (locationsWithCoords.length > 0) {
      return {
        lat: locationsWithCoords[0].latitude!,
        lng: locationsWithCoords[0].longitude!,
      };
    }
    return defaultCenter;
  }, [locationsWithCoords, defaultCenter]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      // Si hay múltiples puntos → ajustar bounds para verlos todos
      if (locationsWithCoords.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        locationsWithCoords.forEach((loc) => {
          bounds.extend({ lat: loc.latitude!, lng: loc.longitude! });
        });
        map.fitBounds(bounds, 60);
      }
    },
    [locationsWithCoords]
  );

  // Cuando cambia el punto seleccionado → zoom a él
  const handleMarkerClick = useCallback(
    (loc: PickupLocation) => {
      onSelect(loc.id);
      setOpenInfoId(loc.id);
      if (loc.latitude && loc.longitude && mapRef.current) {
        mapRef.current.panTo({ lat: loc.latitude, lng: loc.longitude });
        mapRef.current.setZoom(17);
      }
    },
    [onSelect]
  );

  if (loadError) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800">
        ⚠️ No se pudo cargar el mapa. Puedes elegir tu punto de recojo desde la lista.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-72 bg-gray-100 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <p className="text-xs text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  // Si no hay puntos con GPS → no mostramos mapa (fallback en lista)
  if (locationsWithCoords.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter}
        zoom={14}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {locationsWithCoords.map((loc) => {
          const isSelected = selectedId === loc.id;
          return (
            <Marker
              key={loc.id}
              position={{ lat: loc.latitude!, lng: loc.longitude! }}
              onClick={() => handleMarkerClick(loc)}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 14 : 10,
                fillColor: isSelected ? primaryColor : '#6b7280',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
              label={
                isSelected
                  ? {
                      text: '📍',
                      fontSize: '14px',
                    }
                  : undefined
              }
              animation={isSelected ? google.maps.Animation.BOUNCE : undefined}
            >
              {openInfoId === loc.id && (
                <InfoWindow
                  position={{ lat: loc.latitude!, lng: loc.longitude! }}
                  onCloseClick={() => setOpenInfoId(null)}
                >
                  <div style={{ padding: '4px', maxWidth: '220px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#111' }}>
                      🏪 {loc.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                      {loc.street}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555' }}>
                      {loc.district}, {loc.city}
                    </div>
                    {loc.reference && (
                      <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        📌 {loc.reference}
                      </div>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: primaryColor,
                        color: 'white',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textDecoration: 'none',
                      }}
                    >
                      🚗 Cómo llegar
                    </a>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          );
        })}
      </GoogleMap>

      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>💡 Toca un pin para ver detalles</span>
        <span>{locationsWithCoords.length} punto{locationsWithCoords.length === 1 ? '' : 's'} con GPS</span>
      </div>
    </div>
  );
}