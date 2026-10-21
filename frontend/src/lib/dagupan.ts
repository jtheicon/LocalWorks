// LocalWorks serves Dagupan City only: job and worker locations must be one of its 31 barangays.
// Keep in sync with backend/src/data/dagupan.ts (the server rejects anything else).
export const CITY = "Dagupan City, Pangasinan";

export const DAGUPAN_BARANGAYS = [
  "Bacayao Norte", "Bacayao Sur", "Barangay I (T. Bugallon)", "Barangay II (Nueva)",
  "Barangay IV (Zamora)", "Bolosan", "Bonuan Binloc", "Bonuan Boquig", "Bonuan Gueset",
  "Calmay", "Carael", "Caranglaan", "Herrero-Perez", "Lasip Chico", "Lasip Grande",
  "Lomboy", "Lucao", "Malued", "Mamalingling", "Mangin", "Mayombo", "Pantal",
  "Poblacion Oeste", "Pogo Chico", "Pogo Grande", "Pugaro Suit", "Salapingao",
  "Salisay", "Tambac", "Tapuac", "Tebeng",
] as const;

// "[street or landmark, ]<barangay>, Dagupan City, Pangasinan"
export const formatDagupanLocation = (barangay: string, street = "") =>
  [street.trim(), barangay, CITY].filter(Boolean).join(", ");

// Splits a stored location back into its parts; barangay is "" for older, non-Dagupan values.
export const parseDagupanLocation = (location: string) => {
  const suffix = `, ${CITY}`;
  if (!location?.endsWith(suffix)) return { street: "", barangay: "" };

  const rest = location.slice(0, -suffix.length);
  const barangay = DAGUPAN_BARANGAYS.find((b) => rest === b || rest.endsWith(`, ${b}`)) ?? "";
  const street = barangay ? rest.slice(0, -barangay.length).replace(/,\s*$/, "").trim() : "";
  return { street, barangay };
};
