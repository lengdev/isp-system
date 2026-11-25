import { RegistryPermission, RegistryFeature } from './types.js';

import * as dashboard from './dashboard.js';
import * as customers from './customers.js';
import * as packages from './packages.js';
import * as network from './network.js';
import * as billing from './billing.js';
import * as accounting from './accounting.js';
import * as inventory from './inventory.js';
import * as procurement from './procurement.js';
import * as operations from './operations.js';
import * as reports from './reports.js';
import * as automation from './automation.js';
import * as portal from './portal.js';
import * as messages from './messages.js';
import * as integrations from './integrations.js';
import * as settings from './settings.js';
import * as usersRoles from './users-roles.js';

export * from './types.js';
export * from './roles.js';

export const ALL_REGISTRY_PERMISSIONS: RegistryPermission[] = [
  ...customers.permissions,
  ...packages.permissions,
  ...network.permissions,
  ...billing.permissions,
  ...accounting.permissions,
  ...inventory.permissions,
  ...procurement.permissions,
  ...operations.permissions,
  ...reports.permissions,
  ...automation.permissions,
  ...portal.permissions,
  ...messages.permissions,
  ...integrations.permissions,
  ...settings.permissions,
  ...usersRoles.permissions,
];

export const ALL_REGISTRY_FEATURES: RegistryFeature[] = [
  ...dashboard.features,
  ...customers.features,
  ...inventory.features,
  ...procurement.features,
  ...packages.features,
  ...network.features,
  ...billing.features,
  ...accounting.features,
  ...operations.features,
  ...reports.features,
  ...portal.features,
  ...messages.features,
  ...automation.features,
  ...integrations.features,
  ...settings.features,
  ...usersRoles.features,
];
