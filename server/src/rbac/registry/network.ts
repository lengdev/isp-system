import { RegistryPermission, RegistryFeature } from './types.js';

export const permissions: RegistryPermission[] = [
  { key: 'network.view', group: 'Network', label: 'View Network', description: 'Monitor network topology, devices and interface statuses', sortOrder: 30, dependsOnKey: null },
  { key: 'network.create', group: 'Network', label: 'Add Network Device', description: 'Provision new routers, switches and OLTs', sortOrder: 31, dependsOnKey: 'network.view' },
  { key: 'network.edit', group: 'Network', label: 'Edit Network Config', description: 'Modify network configurations and interface bindings', sortOrder: 32, dependsOnKey: 'network.view' },
  { key: 'network.delete', group: 'Network', label: 'Delete Network Device', description: 'Remove network hardware from inventory', sortOrder: 33, dependsOnKey: 'network.view' },
  { key: 'routers.manage', group: 'Network', label: 'Manage Routers', description: 'Configure MikroTik and core routing devices', sortOrder: 34, dependsOnKey: 'network.view' },
  { key: 'routers.reboot', group: 'Network', label: 'Reboot Router', description: 'Send remote reboot and reload commands to routers', sortOrder: 35, dependsOnKey: 'network.view' },
  { key: 'pppoe.manage', group: 'Network', label: 'Manage PPPoE', description: 'Configure PPPoE server profiles, pools and active sessions', sortOrder: 36, dependsOnKey: 'network.view' },
  { key: 'vlans.manage', group: 'Network', label: 'Manage VLANs', description: 'Configure VLAN IDs, trunk ports and access tags', sortOrder: 37, dependsOnKey: 'network.view' },
  { key: 'ipam.manage', group: 'Network', label: 'Manage IPAM', description: 'Allocate IPv4/IPv6 subnets, pools and DHCP servers', sortOrder: 38, dependsOnKey: 'network.view' },
];

export const features: RegistryFeature[] = [
  {
    key: 'nav.network',
    type: 'MENU',
    label: 'Network',
    path: '/network',
    icon: 'Radio',
    sortOrder: 50,
    permissionMode: 'ANY',
    defaultPermissions: ['network.view'],
  },
  {
    key: 'page.network',
    type: 'PAGE',
    label: 'Network Infrastructure',
    path: '/network',
    parentKey: 'nav.network',
    icon: 'Radio',
    sortOrder: 51,
    permissionMode: 'ANY',
    defaultPermissions: ['network.view'],
  },
  {
    key: 'network.btn.reboot',
    type: 'ACTION',
    label: 'Reboot Router Action',
    sortOrder: 52,
    permissionMode: 'ANY',
    defaultPermissions: ['routers.reboot'],
  },
];
