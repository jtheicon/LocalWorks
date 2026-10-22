// Helpers that turn values read from a sign-up document into what the form fields accept.

// "+63 917 123 4567" / "0917-123-4567" -> "9171234567" (what PhoneInput expects), else ""
export const toLocalMobile = (raw: string) => {
  const digits = (raw || "").replace(/\D/g, "").replace(/^(63|0)/, "");
  return /^9\d{9}$/.test(digits) ? digits : "";
};

// "Email: Juan.DelaCruz@gmail.com" / "mailto:juan@gmail.com" -> "juan.delacruz@gmail.com", else ""
export const toEmail = (raw: string) =>
  ((raw || "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? "").toLowerCase();

// Keeps letters, digits and spaces only, e.g. "Peña, Juan D." -> "Pena Juan D"
export const toPlainText = (raw: string, maxLength?: number) => {
  const text = (raw || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return maxLength ? text.slice(0, maxLength).trim() : text;
};

// Finds the dropdown option that matches a value read from a document, ignoring case.
export const matchOption = (value: string, options: string[]) => {
  const wanted = (value || "").trim().toLowerCase();
  if (!wanted) return undefined;
  return (
    options.find((o) => o.toLowerCase() === wanted) ??
    options.find((o) => o.toLowerCase().includes(wanted) || wanted.includes(o.toLowerCase()))
  );
};
