import localFont from 'next/font/local'

/**
 * Primary body font (self-hosted variable font, cursive style toggled via
 * `font-variation-settings: 'CRSV' 1` in globals.css — matches old site's
 * `src/styles/index.css`).
 */
export const geologica = localFont({
  src: '../../public/fonts/Geologica_Cursive-Regular.ttf',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--ff-geologica',
})

/** Brand display font ("Aronetiv Irpin Type") — used via the `.font-aronetiv` helper class. */
export const aronetiv = localFont({
  src: [
    { path: '../../public/fonts/Aronetiv-IrpinType-Light.otf', weight: '300', style: 'normal' },
    { path: '../../public/fonts/Aronetiv-IrpinType-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Aronetiv-IrpinType-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Aronetiv-IrpinType-Bold.otf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--ff-aronetiv',
})

/** "Normal" (non-cursive-variant) cut of Aronetiv — used via the `.font-aronetiv-normal` helper class. */
export const aronetivNormal = localFont({
  src: '../../public/fonts/Aronetiv-IrpinType-Normal.otf',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--ff-aronetiv-normal',
})
