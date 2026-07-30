"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const MapPickerDyn = dynamic(() => import("@/components/map/MapPicker"), { ssr: false });

interface LocationValue {
  lat: number | null;
  lng: number | null;
  adresse: string;
}

interface Props {
  value: LocationValue;
  onChange: (loc: LocationValue) => void;
  hint?: string;
}

export default function LocationPicker({ value, onChange, hint }: Props) {
  function handlePick(lat: number, lng: number, adresse: string) {
    onChange({ lat, lng, adresse });
  }

  return (
    <div className="space-y-3">
      <MapPickerDyn
        lat={value.lat}
        lng={value.lng}
        onPick={handlePick}
      />

      {(value.adresse || (value.lat !== null && value.lng !== null)) && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
          <MapPin size={14} className="text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-800 leading-snug break-words">
              {value.adresse || "Emplacement sélectionné"}
            </p>
            {value.lat !== null && value.lng !== null && (
              <p className="text-[10px] text-green-600 font-mono mt-0.5">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </p>
            )}
          </div>
        </div>
      )}

      {hint && <p className="text-[10px] text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}
