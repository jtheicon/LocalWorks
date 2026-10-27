/** Emoji, pictographs, skin-tone/flag modifiers, ZWJ and variation selectors. */
const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{200D}\u{20E3}\u{FE0E}\u{FE0F}]/gu;

export const stripEmoji = (value: string) => value.replace(EMOJI_PATTERN, "");

/** Phone numbers: digits only, with an optional leading "+". */
export const sanitizePhone = (value: string) => {
  const hasPlus = value.trimStart().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

/** Input types that receive free text and should be emoji-filtered. */
const TEXT_INPUT_TYPES = new Set([undefined, "", "text", "search", "email", "url"]);

export const sanitizeInputValue = (type: string | undefined, value: string) => {
  if (type === "tel") return sanitizePhone(value);
  if (TEXT_INPUT_TYPES.has(type)) return stripEmoji(value);
  return value;
};
