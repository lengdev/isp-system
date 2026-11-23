import fs from 'fs';

console.log('--- Running Search Box Styling & Feature Tests ---');

const topBarContent = fs.readFileSync('src/components/layout/TopBar.tsx', 'utf8');
const toolbarContent = fs.readFileSync('src/components/ui/DataTable/DataTableToolbar.tsx', 'utf8');
const indexCssContent = fs.readFileSync('src/index.css', 'utf8');

// Test 1: Global search height 44px, radius 10px, 1px neutral border, subtle shadow, white/dark surface
const topBarHas44px = topBarContent.includes('h-[44px]');
const topBarHas10pxRadius = topBarContent.includes('rounded-[10px]');
const topBarHasNeutralBorder = topBarContent.includes('border border-zinc-200 dark:border-zinc-700/80');
const topBarHasSubtleShadow = topBarContent.includes('shadow-[0_1px_2px_rgba(0,0,0,0.04)]');
const topBarHasBg = topBarContent.includes('bg-white dark:bg-[#18181b]');

if (topBarHas44px && topBarHas10pxRadius && topBarHasNeutralBorder && topBarHasSubtleShadow && topBarHasBg) {
  console.log('✓ Test 1 Passed: Global search has 44px height, 10px radius, 1px neutral border, subtle shadow, lifted bg');
} else {
  console.error('✗ Test 1 Failed: Global search styling mismatch');
  process.exit(1);
}

// Test 2: Page-level search: 40px height, fixed ~320px growing to 400px on focus, result count beside it
const toolbarHas40px = toolbarContent.includes('h-[40px]');
const toolbarHasWidthTransition = toolbarContent.includes('w-full sm:w-[320px] focus-within:sm:w-[400px]');
const toolbarHasResultCount = toolbarContent.includes('{filteredCount} results');

if (toolbarHas40px && toolbarHasWidthTransition && toolbarHasResultCount) {
  console.log('✓ Test 2 Passed: Page-level search has 40px height, 320px->400px expand on focus, and result count beside it');
} else {
  console.error('✗ Test 2 Failed: Page-level search width or height mismatch');
  process.exit(1);
}

// Test 3: Focus-within clean state (1px primary border + inset ring, no outer ring-2 glow, primary search icon)
const topBarFocusWithin =
  topBarContent.includes('focus-within:border-[#006FEE]') &&
  topBarContent.includes('focus-within:[box-shadow:inset_0_0_0_1px_#006FEE]') &&
  !topBarContent.includes('focus-within:ring-2');
const toolbarFocusWithin =
  toolbarContent.includes('focus-within:border-[#006FEE]') &&
  toolbarContent.includes('focus-within:[box-shadow:inset_0_0_0_1px_#006FEE]') &&
  !toolbarContent.includes('focus-within:ring-2');
const topBarIconTurnsPrimary = topBarContent.includes("isFocused ? 'text-[#006FEE]' : 'text-zinc-400 dark:text-zinc-500'");
const toolbarIconTurnsPrimary = toolbarContent.includes("isFocused ? 'text-[#006FEE]' : 'text-zinc-400 dark:text-zinc-500'");

if (topBarFocusWithin && toolbarFocusWithin && topBarIconTurnsPrimary && toolbarIconTurnsPrimary) {
  console.log('✓ Test 3 Passed: Focus-within uses single 1px primary border with inset ring, no outer glow, icon turns primary');
} else {
  console.error('✗ Test 3 Failed: Focus-within styling or icon color mismatch');
  process.exit(1);
}

// Test 4: Shortcut badges (⌘K and /) 11-12px, 1px border, 6px radius, light gray bg, hidden while focused, clear button with value
const topBarKeycap =
  topBarContent.includes('rounded-[6px] border border-zinc-200 dark:border-zinc-700/80') &&
  topBarContent.includes('⌘K') &&
  topBarContent.includes('!isFocused');
const toolbarKeycap =
  toolbarContent.includes('rounded-[6px] border border-zinc-200 dark:border-zinc-700/80') &&
  toolbarContent.includes('!isFocused') &&
  toolbarContent.includes('>');
const topBarClearBtn = topBarContent.includes('aria-label="Clear search"');
const toolbarClearBtn = toolbarContent.includes('aria-label="Clear search"');

if (topBarKeycap && toolbarKeycap && topBarClearBtn && toolbarClearBtn) {
  console.log('✓ Test 4 Passed: ⌘K and / keycap badges have 6px radius, 1px border, hide on focus, clear button appears with value');
} else {
  console.error('✗ Test 4 Failed: Keycap badges or clear button mismatch');
  process.exit(1);
}

// Test 5: Loading spinner replaces search icon while searching (~250ms debounce)
const topBarLoader = topBarContent.includes('Loader2') && topBarContent.includes('animate-spin') && topBarContent.includes('isSearching');
const toolbarLoader = toolbarContent.includes('Loader2') && toolbarContent.includes('animate-spin') && toolbarContent.includes('isSearching');

if (topBarLoader && toolbarLoader) {
  console.log('✓ Test 5 Passed: Loading spinner replaces search icon during 250ms search debounce');
} else {
  console.error('✗ Test 5 Failed: Loading spinner missing from search inputs');
  process.exit(1);
}

// Test 6: Global search dropdown panel: 12px radius, soft shadow, 6px gap, 40px rows, 120ms motion, grouped results (Customers, Devices, Plans), active row, keyboard navigation
const topBarPanelRadius = topBarContent.includes('rounded-[12px]');
const topBarPanelGap = topBarContent.includes('top-[calc(100%+6px)]');
const topBarPanelShadow = topBarContent.includes('shadow-[0_8px_24px_rgba(0,0,0,0.08)]');
const topBarPanelMotion = topBarContent.includes('transition={{ duration: 0.12');
const topBarPanelRows = topBarContent.includes('h-[40px] min-h-[40px] px-3 rounded-[8px]');
const topBarQuickFilters = topBarContent.includes('Recent Searches / Quick Filters') && topBarContent.includes('quickFilters');
const topBarGroups =
  topBarContent.includes('matchedCustomers') &&
  topBarContent.includes('matchedDevices') &&
  topBarContent.includes('matchedPlans');
const topBarKeyboardNav =
  topBarContent.includes("e.key === 'ArrowDown'") &&
  topBarContent.includes("e.key === 'ArrowUp'") &&
  topBarContent.includes("e.key === 'Enter'") &&
  topBarContent.includes("e.key === 'Escape'");
const topBarEmptyState =
  topBarContent.includes('No results for') &&
  topBarContent.includes('Try searching by customer name, IP, MAC address, device, or plan');

if (
  topBarPanelRadius &&
  topBarPanelGap &&
  topBarPanelShadow &&
  topBarPanelMotion &&
  topBarPanelRows &&
  topBarQuickFilters &&
  topBarGroups &&
  topBarKeyboardNav &&
  topBarEmptyState
) {
  console.log('✓ Test 6 Passed: Global search dropdown has 12px radius, 6px gap, 0 8px 24px soft shadow, 40px rows, 120ms motion, Quick Filters, grouped results, keyboard nav, empty state');
} else {
  console.error('✗ Test 6 Failed: Global search dropdown panel features mismatch', {
    topBarPanelRadius,
    topBarPanelGap,
    topBarPanelShadow,
    topBarPanelMotion,
    topBarPanelRows,
    topBarQuickFilters,
    topBarGroups,
    topBarKeyboardNav,
    topBarEmptyState,
  });
  process.exit(1);
}

// Test 7: CSS reusable .search-control class defined in index.css
const hasSearchControlCss =
  indexCssContent.includes('.search-control') &&
  indexCssContent.includes('border-color: #006FEE !important') &&
  indexCssContent.includes('box-shadow: inset 0 0 0 1px #006FEE !important');

if (hasSearchControlCss) {
  console.log('✓ Test 7 Passed: .search-control class defined with shared focus tokens in index.css');
} else {
  console.error('✗ Test 7 Failed: .search-control CSS rule missing in index.css');
  process.exit(1);
}

console.log('\n========================================');
console.log('ALL SEARCH BOX STYLE & FEATURE TESTS PASSED! ✓');
console.log('========================================\n');
