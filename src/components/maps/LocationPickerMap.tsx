import { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const LIBRARIES: ('places')[] = ['places'];
const LOADER_ID = 'dropship-google-maps-loader';

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
  street?: string;
  district?: string;
  city?: string;
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

function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined
): { street: string; district: string; city: string } {
  if (!components) return { street: '', district: '', city: '' };

  let streetNumber = '';
  let route = '';
  let district = '';
  let city = '';

  for (const c of components) {
    const types = c.types;

    if (types.includes('street_number')) streetNumber = c.long_name;
    if (types.includes('route')) route = c.long_name;

    if (
      types.includes('sublocality_level_1') ||
      types.includes('sublocality') ||
      types.includes('neighborhood') ||
      types.includes('locality')
    ) {
      if (!district) district = c.long_name;
    }

    if (types.includes('administrative_area_level_2')) {
      if (!city) city = c.long_name;
    }

    if (!city && types.includes('locality')) {
      city = c.long_name;
    }
  }

  const street = [route, streetNumber].filter(Boolean).join(' ').trim();
  return { street, district, city };
}

export default function LocationPickerMap({
  initialLocation,
  onLocationSelect,
  defaultCity = 'iquitos',
}: LocationPickerMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
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

  const onPlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const address = place.formatted_address || '';
    const placeId = place.place_id || '';

    const parsed = parseAddressComponents(place.address_components);

    setMarkerPosition({ lat, lng });
    setSelectedAddress(address);
    mapRef.current?.panTo({ lat, lng });
    mapRef.current?.setZoom(17);

    onLocationSelect({
      latitude: lat,
      longitude: lng,
      formatted_address: address,
      google_place_id: placeId,
      street: parsed.street || address.split(',')[0]?.trim() || '',
      district: parsed.district,
      city: parsed.city || (defaultCity === 'iquitos' ? 'Iquitos' : 'Lima'),
    });
  }, [onLocationSelect, defaultCity]);

  const onMarkerDragEnd = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });

      const geocoder = new google.maps.Geocoder();
      try {
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
          const result = response.results[0];
          const address = result.formatted_address;
          const placeId = result.place_id;
          const parsed = parseAddressComponents(result.address_components);

          setSelectedAddress(address);
          onLocationSelect({
            latitude: lat,
            longitude: lng,
            formatted_address: address,
            google_place_id: placeId,
            street: parsed.street || address.split(',')[0]?.trim() || '',
            district: parsed.district,
            city: parsed.city || (defaultCity === 'iquitos' ? 'Iquitos' : 'Lima'),
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
    [onLocationSelect, defaultCity]
  );

  const onMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      await onMarkerDragEnd(e);
    },
    [onMarkerDragEnd]
  );

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

        const geocoder = new google.maps.Geocoder();
        try {
          const response = await geocoder.geocode({ location: { lat, lng } });
          if (response.results[0]) {
            const result = response.results[0];
            const address = result.formatted_address;
            const placeId = result.place_id;
            const parsed = parseAddressComponents(result.address_components);

            setSelectedAddress(address);
            onLocationSelect({
              latitude: lat,
              longitude: lng,
              formatted_address: address,
              google_place_id: placeId,
              street: parsed.street || address.split(',')[0]?.trim() || '',
              district: parsed.district,
              city: parsed.city || (defaultCity === 'iquitos' ? 'Iquitos' : 'Lima'),
            });
          }
        } catch (err) {
          console.error('Error geocoding reverso mi ubicación:', err);
        }
      },
      (err) => {
        alert('No pudimos obtener tu ubicación: ' + err.message);
      }
    );
  }, [onLocationSelect, defaultCity]);

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
      <div className="flex gap-2 flex-col sm:flex-row">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            componentRestrictions: { country: 'pe' },
            fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components'],
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

      {selectedAddress && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">📌 Dirección:</span> {selectedAddress}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            Coords: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </p>
          <p className="text-xs text-emerald-700 mt-1 font-medium">
            ✨ Los campos del formulario se autocompletaron
          </p>
        </div>
      )}

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

      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 <strong>Busca</strong> tu dirección, <strong>arrastra</strong> el marcador o <strong>haz click</strong> en el mapa</p>
        <p>📱 <strong>Móvil:</strong> Toca el mapa para mover el pin</p>
      </div>
    </div>
  );
}