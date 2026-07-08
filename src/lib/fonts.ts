export type FontCat = 'sans' | 'serif' | 'mono'

export interface FontDef {
  name: string
  css: string
  cat: FontCat
}

/** Common fonts people know from Word / Google Docs / Sheets. Rendered with the
 *  real OS font on screen; mapped to the closest standard PDF font on export. */
export const FONTS: FontDef[] = [
  { name: 'Arial', css: 'Arial, Helvetica, sans-serif', cat: 'sans' },
  { name: 'Helvetica', css: 'Helvetica, Arial, sans-serif', cat: 'sans' },
  { name: 'Calibri', css: 'Calibri, "Segoe UI", sans-serif', cat: 'sans' },
  { name: 'Verdana', css: 'Verdana, Geneva, sans-serif', cat: 'sans' },
  { name: 'Tahoma', css: 'Tahoma, Geneva, sans-serif', cat: 'sans' },
  { name: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif', cat: 'sans' },
  { name: 'Segoe UI', css: '"Segoe UI", Roboto, sans-serif', cat: 'sans' },
  { name: 'Roboto', css: 'Roboto, "Segoe UI", sans-serif', cat: 'sans' },
  { name: 'Times New Roman', css: '"Times New Roman", Times, serif', cat: 'serif' },
  { name: 'Georgia', css: 'Georgia, "Times New Roman", serif', cat: 'serif' },
  { name: 'Cambria', css: 'Cambria, Georgia, serif', cat: 'serif' },
  { name: 'Garamond', css: 'Garamond, "Times New Roman", serif', cat: 'serif' },
  { name: 'Book Antiqua', css: '"Book Antiqua", Palatino, serif', cat: 'serif' },
  { name: 'Courier New', css: '"Courier New", Courier, monospace', cat: 'mono' },
  { name: 'Consolas', css: 'Consolas, "Courier New", monospace', cat: 'mono' },
  { name: 'Comic Sans MS', css: '"Comic Sans MS", "Comic Sans", cursive', cat: 'sans' },
  // Common web / Google fonts (used by many exported PDFs)
  { name: 'Open Sans', css: '"Open Sans", sans-serif', cat: 'sans' },
  { name: 'Lato', css: 'Lato, sans-serif', cat: 'sans' },
  { name: 'Montserrat', css: 'Montserrat, sans-serif', cat: 'sans' },
  { name: 'Poppins', css: 'Poppins, sans-serif', cat: 'sans' },
  { name: 'Noto Sans', css: '"Noto Sans", sans-serif', cat: 'sans' },
  { name: 'PT Sans', css: '"PT Sans", sans-serif', cat: 'sans' },
  { name: 'Source Sans Pro', css: '"Source Sans Pro", sans-serif', cat: 'sans' },
  { name: 'Nunito', css: 'Nunito, sans-serif', cat: 'sans' },
  { name: 'Raleway', css: 'Raleway, sans-serif', cat: 'sans' },
  { name: 'Merriweather', css: 'Merriweather, serif', cat: 'serif' },
  // LaTeX / academic fonts (display uses installed CM/Latin-Modern if present)
  { name: 'Computer Modern', css: '"Latin Modern Roman", "CMU Serif", Georgia, serif', cat: 'serif' },
  { name: 'Computer Modern Sans', css: '"Latin Modern Sans", "CMU Sans Serif", Arial, sans-serif', cat: 'sans' },
  { name: 'Computer Modern Mono', css: '"Latin Modern Mono", "CMU Typewriter Text", "Courier New", monospace', cat: 'mono' },
  { name: 'Latin Modern', css: '"Latin Modern Roman", "CMU Serif", Georgia, serif', cat: 'serif' },
  { name: 'Latin Modern Sans', css: '"Latin Modern Sans", "CMU Sans Serif", Arial, sans-serif', cat: 'sans' },
  { name: 'Latin Modern Mono', css: '"Latin Modern Mono", "Courier New", monospace', cat: 'mono' },
]

const BY_NAME = new Map(FONTS.map((f) => [f.name.toLowerCase(), f]))

/** CSS font-family string for a stored font name. */
export function cssForFont(family: string | undefined): string {
  if (!family) return 'Helvetica, Arial, sans-serif'
  const def = BY_NAME.get(family.toLowerCase())
  if (def) return def.css
  return `"${family}", ${guessCat(family) === 'serif' ? 'Georgia, serif' : guessCat(family) === 'mono' ? '"Courier New", monospace' : 'Arial, sans-serif'}`
}

function guessCat(name: string): FontCat {
  const s = name.toLowerCase()
  if (/courier|mono|consol/.test(s)) return 'mono'
  if (/times|georgia|garamond|roman|minion|cambria|book|serif|palatino/.test(s)) return 'serif'
  return 'sans'
}

/** Serif / sans / mono category for a stored font name (used for export mapping). */
export function fontCat(family: string | undefined): FontCat {
  if (!family) return 'sans'
  return BY_NAME.get(family.toLowerCase())?.cat ?? guessCat(family)
}

// Known families matched by substring; longer keys first so "timesnewroman"
// wins over "times", "couriernew" over "courier", etc.
const FAMILY_MATCHERS: [string, string][] = [
  ['timesnewroman', 'Times New Roman'],
  ['sourcesanspro', 'Source Sans Pro'],
  ['sourcesans', 'Source Sans Pro'],
  ['bookantiqua', 'Book Antiqua'],
  ['merriweather', 'Merriweather'],
  ['montserrat', 'Montserrat'],
  ['trebuchet', 'Trebuchet MS'],
  ['comicsans', 'Comic Sans MS'],
  ['couriernew', 'Courier New'],
  ['opensans', 'Open Sans'],
  ['notosans', 'Noto Sans'],
  ['segoeui', 'Segoe UI'],
  ['helvetica', 'Helvetica'],
  ['garamond', 'Garamond'],
  ['palatino', 'Book Antiqua'],
  ['consolas', 'Consolas'],
  ['poppins', 'Poppins'],
  ['raleway', 'Raleway'],
  ['ptsans', 'PT Sans'],
  ['calibri', 'Calibri'],
  ['verdana', 'Verdana'],
  ['georgia', 'Georgia'],
  ['cambria', 'Cambria'],
  ['courier', 'Courier New'],
  ['nunito', 'Nunito'],
  ['tahoma', 'Tahoma'],
  ['roboto', 'Roboto'],
  ['arial', 'Arial'],
  ['times', 'Times New Roman'],
  ['lato', 'Lato'],
]

/** Parse a PDF PostScript font name (e.g. "ABCDEF+Arial-BoldMT") into a friendly
 *  family name plus weight/style. */
export function parsePdfFontName(psName: string): {
  family: string
  bold: boolean
  italic: boolean
} {
  const raw = String(psName || '').replace(/^[A-Z]{6}\+/, '') // strip subset prefix
  const lower = raw.toLowerCase()
  const compact = lower.replace(/[\s_,-]+/g, '')

  // ---- LaTeX Computer Modern (CMR/CMBX/CMTI/CMTT/CMSS/CMSL/CMMI...) ----
  // Bold is "BX"/"B", italic is "TI"/"SL", typewriter is "TT", sans is "SS".
  if (/^cm[a-z]/.test(compact) || compact.startsWith('computermodern')) {
    const bold = /cmbx|cmssbx|cmssdc|cmb\d|cmbxti|cmbxsl|cmdunh/.test(compact)
    const italic = /cmti|cmsl|cmssi|cmmi|cmitt|cmsltt|cmu\d|cmbxti|cmbxsl/.test(compact)
    let family = 'Computer Modern'
    if (/cmtt|cmitt|cmsltt|cmtex|cmvtt/.test(compact)) family = 'Computer Modern Mono'
    else if (/cmss/.test(compact)) family = 'Computer Modern Sans'
    return { family, bold, italic }
  }
  // ---- Latin Modern (newer LaTeX): LMRoman / LMSans / LMMono ----
  if (/^lm[a-z]/.test(compact) || compact.startsWith('latinmodern')) {
    const bold = /bold|bx|semibold|black/.test(compact)
    const italic = /italic|oblique|slant|\bit\b|ti\d/.test(compact)
    let family = 'Latin Modern'
    if (/mono|typewriter|lmtt/.test(compact)) family = 'Latin Modern Mono'
    else if (/sans|lmss/.test(compact)) family = 'Latin Modern Sans'
    return { family, bold, italic }
  }
  // ---- Nimbus / URW (Ghostscript substitutes for Times/Helvetica/Courier) ----
  if (/nimbusrom|nimbusserif/.test(compact))
    return { family: 'Times New Roman', bold: /med|bold|bd/.test(compact), italic: /ital|obli/.test(compact) }
  if (/nimbussan|nimbussans/.test(compact))
    return { family: 'Helvetica', bold: /bold|bd|med/.test(compact), italic: /ital|obli/.test(compact) }
  if (/nimbusmon/.test(compact))
    return { family: 'Courier New', bold: /bold|bd/.test(compact), italic: /obli|ital/.test(compact) }

  const bold = /bold|black|heavy|semibold|extrabold/.test(lower)
  const italic = /italic|oblique/.test(lower)

  for (const [key, name] of FAMILY_MATCHERS) {
    if (compact.includes(key)) return { family: name, bold, italic }
  }

  // Unknown font: strip weight/style/technical suffixes to get a base name.
  const base = raw
    .replace(/[-_,\s]*(BoldItalic|BoldOblique|SemiBold|ExtraBold|Bold|Italic|Oblique|Black|Heavy|Light|Medium|Regular)/gi, '')
    .replace(/(PSMT|PS|MT|MS)$/g, '')
    .replace(/[-_,\s]+$/g, '')
    .trim()
  return { family: base || 'Arial', bold, italic }
}

/** Basic colour palette used everywhere instead of the OS colour dialog. */
export const PALETTE: string[] = [
  '#000000',
  '#5f6368',
  '#9aa0a6',
  '#ffffff',
  '#e01e26',
  '#ff8a00',
  '#f7c600',
  '#1aa64b',
  '#00a3a3',
  '#1f6feb',
  '#6b3fd4',
  '#e91e8c',
]
