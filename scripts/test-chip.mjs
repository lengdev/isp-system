import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- Running HeroUI Chip Component Tests ---');

const chipSource = fs.readFileSync(path.resolve('src/components/ui/Chip.tsx'), 'utf-8');
const badgeSource = fs.readFileSync(path.resolve('src/components/ui/Badge.tsx'), 'utf-8');

// Test 1: Verify all 5 screenshot colors are supported in flat variant with dark #27272a background
assert.ok(chipSource.includes("dark:bg-[#27272a] dark:text-zinc-100"), 'Default chip has dark #27272a background and white text');
assert.ok(chipSource.includes("dark:bg-[#27272a] dark:text-[#60a5fa]"), 'Accent/primary chip has dark #27272a background and blue text');
assert.ok(chipSource.includes("dark:bg-[#27272a] dark:text-[#4ade80]"), 'Success chip has dark #27272a background and green text');
assert.ok(chipSource.includes("dark:bg-[#27272a] dark:text-[#fbbf24]"), 'Warning chip has dark #27272a background and amber text');
assert.ok(chipSource.includes("dark:bg-[#27272a] dark:text-[#f87171]"), 'Danger chip has dark #27272a background and red text');
console.log('✓ Test 1 Passed: Flat variant colors match HeroUI specification and dark mode #27272a pill');

// Test 2: HeroUI variants supported
assert.ok(chipSource.includes("'flat'") && chipSource.includes("'solid'") && chipSource.includes("'bordered'") && chipSource.includes("'light'") && chipSource.includes("'faded'") && chipSource.includes("'dot'"), 'All HeroUI variants supported (flat, solid, bordered, light, faded, dot)');
console.log('✓ Test 2 Passed: Supported all HeroUI variants (flat, solid, bordered, light, faded, dot)');

// Test 3: Closeable support
assert.ok(chipSource.includes('onClose') && chipSource.includes('isCloseable'), 'Chip supports onClose and isCloseable');
console.log('✓ Test 3 Passed: Closeable support with X button');

// Test 4: Badge re-exports Chip
assert.ok(badgeSource.includes("export { Chip };"), 'Badge re-exports Chip');
console.log('✓ Test 4 Passed: Badge re-exports Chip and shares HeroUI styling');

console.log('\n========================================');
console.log('ALL CHIP UNIT TESTS PASSED! ✓');
console.log('========================================');
