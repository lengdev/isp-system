import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  {
    key: 'messages.view',
    group: 'Messages & Broadcast',
    label: 'View Messages',
    description: 'View customer broadcast announcements and notifications',
    sortOrder: 135,
    dependsOnKey: null,
  },
  {
    key: 'messages.send',
    group: 'Messages & Broadcast',
    label: 'Send Broadcasts',
    description: 'Broadcast SMS and email messages to subscribers',
    sortOrder: 136,
    dependsOnKey: 'messages.view',
  },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.messages',
    type: 'MENU',
    label: 'Messages',
    path: '/messages',
    icon: 'Mail',
    sortOrder: 102,
    permissionMode: 'ANY',
    defaultPermissions: [],
  },
  {
    key: 'page.messages',
    type: 'PAGE',
    label: 'Subscriber Messaging & Broadcast',
    path: '/messages',
    parentKey: 'nav.messages',
    icon: 'Mail',
    sortOrder: 103,
    permissionMode: 'ANY',
    defaultPermissions: [],
  },
];
