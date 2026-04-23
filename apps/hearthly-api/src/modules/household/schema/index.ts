// apps/hearthly-api/src/modules/household/schema/index.ts
export { households } from './household.table';
export type { HouseholdRow, NewHousehold } from './household.table';
export {
  householdMemberships,
  HOUSEHOLD_MEMBER_ROLES,
  type HouseholdMemberRole,
  type HouseholdMembershipRow,
  type NewHouseholdMembership,
} from './household-membership.table';
