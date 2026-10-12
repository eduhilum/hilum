import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

const userRoleSchema = z.union([
  z.literal('admin'),
  z.literal('faculty'),
  z.literal('candidate'),
])
export type UserRole = z.infer<typeof userRoleSchema>

const _userSchema = z.object({
  id: z.string(),
  candidate_id: z.string().nullable().optional(),
  full_name: z.string(),
  email: z.string(),
  status: userStatusSchema,
  role: userRoleSchema,
  is_pro_pass_active: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
})
export type User = z.infer<typeof _userSchema>
