import { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Librerías necesarias (constante fuera para evitar re-renders)
const libraries: ('places')[] = ['places'];
// Centro por defecto: IQUITOS (Plaza de Armas)

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '12px',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

export interface LocationData {
  latitude: number;
  longitude: number;
  formatted_address: string;
  google_place_id?: string;
}

interface LocationPickerMapProps {
  initialLocation?: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  defaultCity?: 'iquitos' | 'lima';
}

const CITY_CENTERS = {
  iquitos: { lat: -3.7437, lng: -73.2516 },
  lima: { lat: -12.0464, lng: -77.0428 },
};

export default function LocationPickerMap({
  initialLocation,
  onLocationSelect,
  defaultCity = 'iquitos',
}: LocationPickerMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    language: 'es',
    region: 'PE',
  });

  const [markerPosition, setMarkerPosition] = useState(
    initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : CITY_CENTERS[defaultCity]
  );

  const [selectedAddress, setSelectedAddress] = useState(
    initialLocation?.formatted_address || ''
  );

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  // Cuando el usuario selecciona un lugar del autocomplete
  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || '';
    const placeId = place.place_id || '';

    setMarkerPosition({ lat, lng });
    setSelectedAddress(address);
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(17);

    onLocationSelect({
      latitude: lat,
      longitude: lng,
      formatted_address: address,
      google_place_id: placeId,
    });
  }, [onLocationSelect]);

  // Cuando el usuario arrastra el marcador
  const onMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });

      // Geocoding reverso para obtener dirección
      const geocoder = new google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          const address = response.results[0].formatted_address;
          const placeId = response.results[0].place_id;
          setSelectedAddress(address);
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            formatted_address: address,
            google_place_id: placeId,
          });
        }
      } catch (err) {
        console.error('Error en geocoding reverso:', err);
        onLocationSelect({
          latitude: lat,
          longitude: lng,
          formatted_address: `${lat}, ${lng}`,
        });
      }
    },
    [onLocationSelect]
  );

  // Click en el mapa
  const onMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      await onMarkerDragEnd(e);
    },
    [onMarkerDragEnd]
  );

  // Botón: usar mi ubicación actual
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMarkerPosition({ lat, lng });
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(17);

        // Geocoding reverso
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          const address = response.results[0].formatted_address;
          const placeId = response.results[0].place_id;
          setSelectedAddress(address);
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            formatted_address: address,
            google_place_id: placeId,
          });
        }
      },
      (err) => {
        alert('No pudimos obtener tu ubicación: ' + err.message);
      }
    );
  }, [onLocationSelect]);

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700 font-medium">Error al cargar Google Maps</p>
        <p className="text-red-600 text-sm mt-1">
          Verifica tu API Key y las restricciones.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda con autocompletado */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: { country: 'pe' },
            fields: ['formatted_address', 'geometry', 'place_id', 'name'],
          }}
          className="flex-1"
        >
          <input
            type="text"
            placeholder="🔍 Busca tu dirección (calle, referencia, negocio)..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </Autocomplete>

        <button
          type="button"
          onClick={useMyLocation}
          className="px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 font-medium whitespace-nowrap"
        >
          📍 Mi ubicación
        </button>
      </div>

      {/* Info de la dirección seleccionada */}
      {selectedAddress && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">📌 Dirección:</span> {selectedAddress}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Coords: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Mapa */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={markerPosition}
        zoom={initialLocation ? 17 : 14}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={onMapClick}
      >
        <Marker
          position={markerPosition}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
          animation={google.maps.Animation.DROP}
        />
      </GoogleMap>

      {/* Instrucciones */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Busca</strong> tu dirección, <strong>arrastra</strong> el marcador o <strong>haz click</strong> en el mapa</p>
        <p>📱 <strong>Móvil:</strong> Toca el mapa para mover el pin</p>
      </div>
    </div>
  );
}