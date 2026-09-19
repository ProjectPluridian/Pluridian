/* ============================================================
   BUILD-CSS.MJS
   This script combines all of Pluridian's separate, organized
   CSS files into ONE final file called styles.css — because
   Obsidian only ever reads a single styles.css from a plugin,
   no matter how many source files you organize your work into.

   You never edit styles.css by hand. This script generates it
   fresh every time you run "npm run build" — think of it like
   main.js, which also gets freshly generated from main.ts.

   THE ORDER OF FILES BELOW MATTERS: variables must load first
   (everything else depends on them), and anything meant to
   override other rules should load last.
   ============================================================ */

import { readFileSync, writeFileSync } from 'fs';

// The list of every CSS file to combine, in the exact order
// they should be combined. Add new files here as you create them.
const files = [
	'styles/shared-foundation/colors-fonts-spacing-variables.css',
	'styles/shared-foundation/shared-basic-styles.css',
	'styles/settings-menu/settings-menu-appearance.css',
	'styles/settings-menu/popup-window-styles.css',
	'styles/screen-size-adjustments/phone-and-tablet-adjustments.css'
];

// Read each file, add a clear comment banner showing which file
// this section came from (helpful if you ever open styles.css
// itself to double-check something), then join them all together.
const combined = files
	.map(filePath => `/* ===== From: ${filePath} ===== */\n` + readFileSync(filePath, 'utf8'))
	.join('\n\n');

// Write the final result out to styles.css — this is the file
// Obsidian actually loads.
writeFileSync('styles.css', combined);

console.log(`Combined ${files.length} CSS files into styles.css`);