import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import { authOptions, type Role } from './auth'

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 5,
  SENIOR_AUDITOR: 4,
  AUDITOR: 3,
  REVIEWER: 2,
  READONLY: 1,
}

type Action =
  | 'create_audit'
  | 'edit_audit'
  | 'delete_audit'
  | 'create_finding'
  | 'rate_pillar'
  | 'export'
  | 'view_only'

const ACTION_MIN_ROLE: Record<Action, Role> = {
  create_audit: 'SENIOR_AUDITOR',
  edit_audit: 'AUDITOR',
  delete_audit: 'ADMIN',
  create_finding: 'AUDITOR',
  rate_pillar: 'SENIOR_AUDITOR',
  export: 'REVIEWER',
  view_only: 'READONLY',
}

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}

export async function requireAuth(requiredRole?: Role) {
  const session = await getServerSession()

  if (!session?.user) {
    throw new Error('Not authenticated')
  }

  const userRole = (session.user as { role?: Role }).role

  if (!userRole) {
    throw new Error('User role not found')
  }

  if (requiredRole && ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}, current: ${userRole}`)
  }

  return session
}

export function canPerformAction(userRole: Role, action: Action): boolean {
  const minRole = ACTION_MIN_ROLE[action]
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
