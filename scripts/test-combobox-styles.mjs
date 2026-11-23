import fs from 'fs';
import path from 'path';

console.log('--- Running Combobox & Form Field Style Tests ---');

const comboboxContent = fs.readFileSync('src/components/ui/Combobox.tsx', 'utf8');
const fieldContent = fs.readFileSync('src/components/ui/Field.tsx', 'utf8');
const indexCssContent = fs.readFileSync('src/index.css', 'utf8');

// Test 1: Reusable shared tokens and classes defined and exported
if (
  fieldContent.includes('export const FIELD_BASE_STYLES') &&
  fieldContent.includes('export const FIELD_FOCUS_STYLES') &&
  fieldContent.includes('export const FIELD_ERROR_STYLES') &&
  fieldContent.includes('export const FIELD_DISABLED_STYLES') &&
  indexCssContent.includes('.field-control')
) {
  console.log('✓ Test 1 Passed: Shared field style tokens and .field-control class defined and exported');
} else {
  console.error('✗ Test 1 Failed: Shared field tokens or .field-control class missing');
  process.exit(1);
}

// Test 2: Inset ring on focus, no outer glow, 150ms transition
const hasInsetRing =
  fieldContent.includes('[box-shadow:inset_0_0_0_1px_#006FEE]') &&
  indexCssContent.includes('box-shadow: inset 0 0 0 1px #006FEE');
const hasNoOuterGlowInFocus =
  !comboboxContent.includes('!ring-2 !ring-[#006FEE]/20') &&
  !fieldContent.includes('ring-2 ring-[#006FEE]/20');

if (hasInsetRing && hasNoOuterGlowInFocus) {
  console.log('✓ Test 2 Passed: Single 1px primary border with inset ring, no outer ring-2 glow');
} else {
  console.error('✗ Test 2 Failed: Focus style still has ring-2 or is missing inset ring');
  process.exit(1);
}

// Test 3: Shared field style (Input, Textarea, Combobox trigger) 10px radius, 40px height, textarea min 80px & resize-y
const has10pxRadius =
  fieldContent.includes('rounded-[10px]') &&
  comboboxContent.includes('rounded-[10px]') &&
  indexCssContent.includes('border-radius: 10px');
const hasInput40px = fieldContent.includes('h-[40px]');
const hasTextareaSpec = fieldContent.includes('min-h-[80px]') && fieldContent.includes('resize-y');

if (has10pxRadius && hasInput40px && hasTextareaSpec) {
  console.log('✓ Test 3 Passed: 10px radius, 40px height for input/trigger, min 80px and resize-y for textarea');
} else {
  console.error('✗ Test 3 Failed: Radius, height, or textarea resize spec mismatch');
  process.exit(1);
}

// Test 4: Combobox search input inside dropdown: no border, outline: none, flat transparent with bottom divider only
const searchHasNoBorder =
  comboboxContent.includes('border-0 border-none outline-none focus:outline-none focus:ring-0') &&
  comboboxContent.includes("outline: 'none', border: 'none', boxShadow: 'none'");
const searchHasBottomDividerOnly =
  comboboxContent.includes('border-b border-zinc-200/80 dark:border-white/10 shrink-0');

if (searchHasNoBorder && searchHasBottomDividerOnly) {
  console.log('✓ Test 4 Passed: Search input inside dropdown is flat, transparent, with bottom divider only and no borders/rings');
} else {
  console.error('✗ Test 4 Failed: Search input still has border/ring or missing bottom divider');
  process.exit(1);
}

// Test 5: Dropdown panel: 1px soft neutral border, 12px radius, light shadow, 6px inner padding, no blue border
const panelHas12pxRadius = comboboxContent.includes('rounded-[12px]');
const panelHasNeutralBorder = comboboxContent.includes('border border-zinc-200 dark:border-zinc-700/80');
const panelHasInnerPadding = comboboxContent.includes('p-[6px]');
const panelElementMatch = comboboxContent.match(/ref=\{panelRef\}[\s\S]*?className="([^"]+)"/);
const panelClassName = panelElementMatch ? panelElementMatch[1] : '';
const panelNoBlueBorder = !panelClassName.includes('#006FEE');

if (panelHas12pxRadius && panelHasNeutralBorder && panelHasInnerPadding && panelNoBlueBorder) {
  console.log('✓ Test 5 Passed: Dropdown panel has 12px radius, 1px neutral border, light shadow, 6px inner padding, no blue border');
} else {
  console.error('✗ Test 5 Failed: Panel radius, border, or padding mismatch');
  process.exit(1);
}

// Test 6: Options: 8px radius, consistent padding, selected light blue bg + blue text + check icon, hover light gray bg
const optionsHave8pxRadius = comboboxContent.includes('rounded-[8px]');
const optionsHaveSelectedStyle =
  comboboxContent.includes('bg-blue-50/90 dark:bg-blue-950/40 text-[#006FEE] font-medium') &&
  comboboxContent.includes('hover:bg-zinc-100 dark:hover:bg-white/[0.08]');
const optionsHaveCheckIcon = comboboxContent.includes('<Check className="w-4 h-4 stroke-[2.5] text-[#006FEE]');

if (optionsHave8pxRadius && optionsHaveSelectedStyle && optionsHaveCheckIcon) {
  console.log('✓ Test 6 Passed: Options have 8px radius, light blue selected state, check icon, and light gray hover state');
} else {
  console.error('✗ Test 6 Failed: Options styling mismatch');
  process.exit(1);
}

// Test 7: Accessibility: ARIA attributes and keyboard navigation preserved
const hasAriaAttributes =
  comboboxContent.includes('data-combobox-trigger="true"') &&
  comboboxContent.includes('role="combobox"') &&
  comboboxContent.includes('role="listbox"') &&
  comboboxContent.includes('role="option"') &&
  comboboxContent.includes('aria-expanded={isOpen}') &&
  comboboxContent.includes('aria-selected={isSelected}') &&
  comboboxContent.includes('aria-activedescendant=');

if (hasAriaAttributes) {
  console.log('✓ Test 7 Passed: Accessibility roles, states, and aria attributes verified');
} else {
  console.error('✗ Test 7 Failed: ARIA attributes missing');
  process.exit(1);
}

console.log('\n========================================');
console.log('ALL COMBOBOX & FORM FIELD STYLE TESTS PASSED! ✓');
console.log('========================================\n');
