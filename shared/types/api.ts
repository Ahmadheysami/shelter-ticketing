import type {
  MessageVisibility,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserStatus,
} from '../domain'

// API response contracts shared by client and server. Handlers must not return
// Prisma models directly; these DTOs are the public boundary.

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export interface ApiSuccess<T> {
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  emailVerified: boolean
  mfaEnabled: boolean
  profileCompleted: boolean
  createdAt: string
}

export interface SessionWindow {
  id: string
  createdAt: string
  expiresAt: string
}

export interface MeResponse {
  user: CurrentUser | null
  permissions: string[]
  mfaSatisfied: boolean
  session: SessionWindow | null
}

export interface TicketSummary {
  id: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  requester: { id: string; name: string }
  assignee: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  publicId: string
}

export interface TicketMessageDto {
  id: string
  body: string
  visibility: MessageVisibility
  author: { id: string; name: string; role: Role }
  createdAt: string
  editedAt: string | null
}

export interface TicketDetail {
  id: number
  publicId: string
  subject: string
  description: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  requester: { id: string; name: string; email: string }
  assignee: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string
  resolvedAt: string | null
  closedAt: string | null
  messagesTotal: number
  can: {
    reply: boolean
    internalNote: boolean
    manage: boolean
    close: boolean
    reopen: boolean
    assign: boolean
  }
  messages: TicketMessageDto[]
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface TicketStatusCounts {
  OPEN: number
  IN_PROGRESS: number
  WAITING_FOR_USER: number
  RESOLVED: number
  CLOSED: number
}

export interface UserDashboardStats {
  total: number
  open: number
  waiting: number
  resolved: number
  urgent: number
}

export interface AdminStats {
  totals: TicketStatusCounts & { all: number }
  priority: Record<TicketPriority, number>
  category: Record<TicketCategory, number>
  unassigned: number
  urgentOpen: number
  createdToday: number
  resolutionRate: number
  /** Average hours from creation to resolution for tickets resolved in range. */
  averageResolutionHours: number | null
  trend: Array<{ date: string; created: number; resolved: number }>
  rangeDays: number
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  mfaEnabled: boolean
  profileCompleted: boolean
  lastLoginAt: string | null
  createdAt: string
  ticketCount: number
}

export interface SessionInfo {
  id: string
  current: boolean
  userAgent: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  mfaSatisfied: boolean
}

export interface AuditLogRow {
  id: string
  action: string
  actor: { id: string; name: string; email: string } | null
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuthResult {
  user: CurrentUser
  mfaRequired: boolean
}
