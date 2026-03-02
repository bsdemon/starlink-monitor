import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as L from "leaflet";

import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

type Props = {
  lat: number;
  lon: number;
  label?: string;
};

const markerIcon = new L.Icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function LocationMapLeaflet({ lat, lon, label }: Props) {
  return (
    <div
      style={{
        height: 420,
        width: "100%",
        border: "1px solid #ddd",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={[lat, lon]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]} icon={markerIcon}>
          <Popup>
            <div>
              <div><strong>{label ?? "Device"}</strong></div>
              <div>lat: {lat.toFixed(6)}</div>
              <div>lon: {lon.toFixed(6)}</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}