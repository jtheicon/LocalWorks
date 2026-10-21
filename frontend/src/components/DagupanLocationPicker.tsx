import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITY, DAGUPAN_BARANGAYS, formatDagupanLocation, parseDagupanLocation } from "@/lib/dagupan";

interface DagupanLocationPickerProps {
  // Full location string, e.g. "123 Rizal St, Lucao, Dagupan City, Pangasinan"; "" until a barangay is picked.
  value: string;
  onChange: (location: string) => void;
}

const mapSrc = (query: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

// Barangay dropdown (Dagupan City only) + optional street/landmark, with a map preview.
const DagupanLocationPicker = ({ value, onChange }: DagupanLocationPickerProps) => {
  const [barangay, setBarangay] = useState(() => parseDagupanLocation(value).barangay);
  const [street, setStreet] = useState(() => parseDagupanLocation(value).street);
  const [mapQuery, setMapQuery] = useState(value || CITY);

  // Follow outside changes (profile loaded, form reset, editing another job).
  useEffect(() => {
    if (value === (barangay ? formatDagupanLocation(barangay, street) : "")) return;
    const parsed = parseDagupanLocation(value);
    setBarangay(parsed.barangay);
    setStreet(parsed.street);
    setMapQuery(parsed.barangay ? value : CITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (nextBarangay: string, nextStreet: string) => {
    setBarangay(nextBarangay);
    setStreet(nextStreet);
    onChange(nextBarangay ? formatDagupanLocation(nextBarangay, nextStreet) : "");
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={barangay}
          onValueChange={(b) => {
            update(b, street);
            setMapQuery(formatDagupanLocation(b, street));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select barangay" />
          </SelectTrigger>
          <SelectContent>
            {DAGUPAN_BARANGAYS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Street / landmark (optional)"
          maxLength={80}
          value={street}
          onChange={(e) => update(barangay, e.target.value)}
          // Refresh the map once typing is done, not on every key.
          onBlur={() => barangay && setMapQuery(formatDagupanLocation(barangay, street))}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          src={mapSrc(mapQuery)}
          className="block aspect-[16/9] w-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Map"
        />
        <p className="border-t border-border bg-muted/40 px-3 py-2 text-sm">
          {value ? (
            <>
              <span className="font-medium">Location:</span> {value}
            </>
          ) : (
            <span className="text-muted-foreground">
              Pick a barangay in {CITY}.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default DagupanLocationPicker;
