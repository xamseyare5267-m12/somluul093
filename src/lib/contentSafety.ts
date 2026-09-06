/**
 * Client-side content safety — blocks obvious nude/sex/pornographic
 * filenames and text before they reach the server.
 * Server enforces the same rules (source of truth).
 */

const EXPLICIT_PATTERNS: RegExp[] = [
  /\b(nude|nudes|naked|porn|porno|xxx|sex\b|sexy|sexual|nsfw|onlyfans|boobs|breast|penis|vagina|pussy|dick|cock|anal|oral\s*sex|blowjob|handjob|cumshot|ejaculat|orgasm|masturbat|hentai|hardcore|softcore|erotic|erotica|strip(?:per|ping)?|camgirl|camboy|fetish|bdsm|incest|rape|raping|molest)\b/i,
  /\b(qaawan|qaawanaan|galmo|xishood\s*la'?aan|anshax\s*xumo|sawir\s*qaawan|muqaal\s*galmo)\b/i,
  /(^|[_\-\s.])(nude|nudes|porn|xxx|sex|nsfw|hentai|onlyfans)([_\-\s.]|$)/i,
];

export const CONTENT_SAFETY_MESSAGE_SO =
  'Mamnuuc: Muqaalada/sawirrada/qoraalka anshax-xumada (nude, sex, porn iwm) looma oggola SomLuul. Fadlan soo geli wax nadiif ah.';

export const CONTENT_SAFETY_MESSAGE_EN =
  'Forbidden: Nude, sexual, or pornographic content is not allowed on SomLuul. Please upload clean content only.';

export function isExplicitText(input: unknown): boolean {
  if (input == null) return false;
  let s = String(input);
  // Never scan base64 data-URL bodies (false positives on clean photos/videos)
  if (/^data:/i.test(s)) {
    const semi = s.indexOf(';');
    const comma = s.indexOf(',');
    s = s.slice(0, Math.min(semi > 0 ? semi : 40, comma > 0 ? comma : 40));
  } else if (s.length > 400) {
    s = s.slice(0, 300);
  }
  s = s.toLowerCase().trim();
  if (!s) return false;
  return EXPLICIT_PATTERNS.some((re) => re.test(s));
}

export function isExplicitFilename(name: unknown): boolean {
  if (!name) return false;
  const raw = String(name);
  if (/^data:/i.test(raw) || raw.length > 200) return false;
  const base = raw.toLowerCase().replace(/\.[a-z0-9]+$/i, '');
  const onlyName = base.split('/').pop() || base;
  return isExplicitText(onlyName);
}

export type ContentSafetyResult = { ok: true; message?: string } | { ok: false; message: string };

export function assertCleanContent(
  language: string,
  ...parts: unknown[]
): ContentSafetyResult {
  for (const p of parts) {
    if (isExplicitText(p) || isExplicitFilename(p)) {
      return {
        ok: false,
        message: language === 'so' ? CONTENT_SAFETY_MESSAGE_SO : CONTENT_SAFETY_MESSAGE_EN,
      };
    }
  }
  return { ok: true };
}

export function assertCleanFile(
  file: File,
  language: string
): ContentSafetyResult {
  return assertCleanContent(language, file.name, file.type);
}
