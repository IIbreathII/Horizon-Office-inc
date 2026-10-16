import { Manrope, Onest } from 'next/font/google';

// Fonts for the volunteer pages (not the map). Both include Cyrillic, which the UI copy needs.
const display = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-display', display: 'swap' });
const body = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-body', display: 'swap' });

/** Put on the page root: defines the font variables and sets the body font. */
export const FONT_VARIABLES = `${display.variable} ${body.variable} font-(family-name:--font-body)`;

/** Display face for headings and numbers. */
export const DISPLAY = 'font-(family-name:--font-display)';
