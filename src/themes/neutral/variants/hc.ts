import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '../neutralTheme';
import {highContrastTokens} from '../neutralVariants';

/** High contrast on the default (Claude) palette: neutral's own
 * black-and-white accent, with the stronger text and borders. */
export const neutralHcTheme = defineTheme({
  name: 'neutral-hc',
  extends: neutralTheme,
  tokens: highContrastTokens,
});
