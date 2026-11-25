/**
 * Executes a smooth, modern diagonal theme transition spreading from the
 * bottom-left corner (0% 100%) to the top-right corner (100% 0%).
 *
 * Uses the native View Transitions API when available (Chromium, Safari 18+),
 * capturing a pixel-perfect snapshot of the old state and cleanly revealing
 * the live new theme with an expanding circular clip-path wavefront centered
 * at the bottom-left corner.
 *
 * Prevents competing CSS transitions via the .theme-transitioning class to
 * eliminate flickering, font jitters, and border flash.
 */
export function executeDiagonalThemeTransition(commitThemeChange: () => void): void {
  if (
    typeof document === 'undefined' ||
    !('startViewTransition' in document) ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    commitThemeChange();
    return;
  }

  // Freeze individual element CSS transitions to avoid flickering
  document.documentElement.classList.add('theme-transitioning');

  const transition = (document as any).startViewTransition(() => {
    commitThemeChange();
  });

  transition.ready
    .then(() => {
      // Calculate hypotenuse of the viewport to ensure complete corner-to-corner coverage
      const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);

      // Expanding circular wavefront originating from bottom-left corner (0px, 100% of height)
      const animation = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at 0% 100%)`,
            `circle(${Math.ceil(maxRadius * 1.05)}px at 0% 100%)`,
          ],
        },
        {
          duration: 650,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );

      const cleanup = () => {
        document.documentElement.classList.remove('theme-transitioning');
      };

      animation.onfinish = cleanup;
      animation.oncancel = cleanup;
    })
    .catch(() => {
      document.documentElement.classList.remove('theme-transitioning');
    });

  transition.finished.finally(() => {
    document.documentElement.classList.remove('theme-transitioning');
  });
}
