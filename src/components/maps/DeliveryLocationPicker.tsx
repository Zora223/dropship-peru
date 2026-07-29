import { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const IQUITOS_CENTER = { lat: -3.7437, lng: -73.2516 };
const LIBRARIES: ('places')[] = ['places'];
const LOADER_ID = 'dropship-google-maps-loader';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  formatted_address: string;
  street?: string;
  district?: string;
  city?: string;
}

interface Props {
  onLocationSelect: (location: DeliveryLocation) => void;
  primaryColor?: string;
}

export default function DeliveryLocationPicker({
  onLocationSelect,
  primaryColor = '#e11d48',
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
    language: 'es',
    region: 'PE',
  });

  const [markerPosition, setMarkerPosition] = useState(IQUITOS_CENTER);
  const [address, setAddress] = useState('');
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const parseAddressComponents = (
    components: google.maps.GeocoderAddressComponent[] = []
  ) => {
    const result: any = {};
    components.forEach((c) => {
      if (c.types.includes('route')) result.street = c.long_name;
      if (
        c.types.includes('sublocality') ||
        c.types.includes('sublocality_level_1')
      ) {
        result.district = c.long_name;
      }
      if (c.types.includes('locality')) result.city = c.long_name;
    });
    return result;
  };

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!window.google) return;
      const geocoder = new window.google.maps.Geocoder();
      try {
        const result = await geocoder.geocode({ location: { lat, lng } });
        if (result.results[0]) {
          const place = result.results[0];
          const components = parseAddressComponents(place.address_components);
          setAddress(place.formatted_address);
          setHasSelected(true);
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            formatted_address: place.formatted_address,
            ...components,
          });
        }
      } catch (err) {
        console.error('Error geocoding:', err);
      }
    },
    [onLocationSelect]
  );

  const onMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setMarkerPosition({ lat, lng });
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(17);
    setAddress(place.formatted_address || '');
    setHasSelected(true);

    const components = parseAddressComponents(place.address_components);
    onLocationSelect({
      latitude: lat,
      longitude: lng,
      formatted_address: place.formatted_address || '',
      ...components,
    });
  }, [onLocationSelect]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarkerPosition({ lat, lng });
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(17);
        reverseGeocode(lat, lng);
        setLoadingGeo(false);
      },
      (err) => {
        console.error('Error GPS:', err);
        alert('No se pudo obtener tu ubicación. Verifica los permisos.');
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        ❌ Error al cargar el mapa. Verifica tu conexión.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="animate-pulse rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        🗺️ Cargando mapa...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Autocomplete
          onLoad={(ac) => (autocompleteRef.current = ac)}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: { country: 'pe' },
            fields: ['formatted_address', 'geometry', 'address_components'],
          }}
          className="flex-1"
        >
          <input
            type="text"
            placeholder="🔍 Busca tu dirección..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
          />
        </Autocomplete>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loadingGeo}
          className="whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:shadow-md active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: primaryColor }}
        >
          {loadingGeo ? '📡 Buscando...' : '📍 Mi ubicación'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-gray-100">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '320px' }}
          center={markerPosition}
          zoom={hasSelected ? 17 : 13}
          onClick={onMapClick}
          onLoad={(map) => {
            mapRef.current = map;
          }}
          options={{
            gestureHandling: 'greedy',
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker
            position={markerPosition}
            draggable
            onDragEnd={onMarkerDragEnd}
          />
        </GoogleMap>
      </div>

      {hasSelected && address && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">✅</span>
            <div className="flex-1">
              <div className="mb-1 text-xs font-bold text-emerald-700">
                Ubicación confirmada:
              </div>
              <div className="text-sm text-gray-800">{address}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>💡 Arrastra el pin para ajustar</span>
        <span>·</span>
        <span>👆 O toca el mapa</span>
        <span>·</span>
        <span>📱 GPS más preciso en móvil</span>
      </div>
    </div>
  );
}