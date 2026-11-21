// Custom lint rules for motion spec adherence
export const motionPlugin = {
  rules: {
    'no-transition-none': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Forbids transition: none which wipes out opacity fades',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              if (node.value.includes('transition: none') && !context.filename.includes('index.css')) {
                context.report({
                  node,
                  message: 'Do not use "transition: none". Keep short opacity/color fades for reduced motion.',
                });
              }
              if (/\btransition-none\b/.test(node.value)) {
                context.report({
                  node,
                  message: 'Do not use "transition-none". Use proper motion tokens and allow fades.',
                });
              }
            }
          },
        };
      },
    },
    'no-raw-durations': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Forbids raw non-token Tailwind durations like duration-300, duration-500',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              // Match tailwind raw duration classes that are not our tokens (120, 200, 320)
              const match = node.value.match(/\bduration-(?!120|200|320|fast|normal|slow)[0-9]+ms?\b/);
              if (match) {
                context.report({
                  node,
                  message: `Raw duration "${match[0]}" is forbidden. Use motion tokens (120ms, 200ms, 320ms or durationFast, durationNormal, durationSlow).`,
                });
              }
            }
          },
        };
      },
    },
  },
};
