import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'automation.view', group: 'Automation', label: 'View Automations', description: 'View scheduled jobs, event triggers and webhook definitions', sortOrder: 100, dependsOnKey: null },
  { key: 'automation.create', group: 'Automation', label: 'Create Automation', description: 'Set up automated reminder messages and billing runs', sortOrder: 101, dependsOnKey: 'automation.view' },
  { key: 'automation.edit', group: 'Automation', label: 'Edit Automation', description: 'Update automation triggers, conditions and action steps', sortOrder: 102, dependsOnKey: 'automation.view' },
  { key: 'automation.delete', group: 'Automation', label: 'Delete Automation', description: 'Disable and remove automated workflows', sortOrder: 103, dependsOnKey: 'automation.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.automation',
    type: 'MENU',
    label: 'Automation',
    path: '/automation',
    icon: 'Zap',
    sortOrder: 104,
    permissionMode: 'ANY',
    defaultPermissions: ['automation.view'],
  },
  {
    key: 'page.automation',
    type: 'PAGE',
    label: 'Automation Workflows',
    path: '/automation',
    parentKey: 'nav.automation',
    icon: 'Zap',
    sortOrder: 105,
    permissionMode: 'ANY',
    defaultPermissions: ['automation.view'],
  },
];
