export type Role = 'super_admin' | 'coach' | 'hero'
export type CoachType = 'online' | 'physical'
export type PlanType = 'A' | 'B' | 'C'
export type PlanBilling = 'monthly' | 'semi_annual' | 'annual'
export type Goal = 'cutting' | 'bulking' | 'maintenance' | 'recomp'
export type GhostPreference = 'last' | 'best'
export type SleepQuality = 'deep' | 'normal' | 'light' | 'broken'
export type Mood = 'pumped' | 'good' | 'normal' | 'tired' | 'exhausted'
export type Soreness = 'none' | 'light' | 'moderate' | 'heavy'
export type CardioType = 'Stairs' | 'Elliptical' | 'Cycling' | 'HIIT' | 'Running' | 'Other'
export type ExerciseKind = 'Compound' | 'Isolation'

export interface JournalConfig {
  steps: boolean
  sleep: boolean
  cardio: boolean
  water: boolean
  body_weight: boolean
  mood: boolean
  soreness: boolean
}

export interface NutritionTargets {
  calories: number
  protein: number
  carbs: number
  fats: number
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  coach_id?: string
  plan_type?: PlanType
  plan_billing?: PlanBilling
  plan_start?: string
  plan_end?: string
  is_active?: boolean
  goal?: Goal
  start_weight?: number
  target_weight?: number
  height?: number
  steps_target?: number
  ghost_preference?: GhostPreference
  journal_config?: JournalConfig
  nutrition_targets?: NutritionTargets
  notes?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  auth_id?: string
  coach_type?: CoachType
  is_physical?: boolean
  // Coach public profile & availability
  accepting_heroes?: boolean
  max_heroes?: number
  coach_bio?: string
  coach_specialty?: string
  plans_config?: PlansConfig
  years_experience?: number
  hero_count?: number
  is_profile_complete?: boolean
  created_at: string
  updated_at?: string
}

// ─── Coach Plans Config ───────────────────────────────────────────────────────

export interface PlanConfig {
  enabled: boolean
  name: string
  description: string
  monthly: number
  semi_annual: number
  annual: number
  discount_active: boolean
  discount_percent: number
  discount_label: string
  discount_expiry: string | null
  features: string[]
}

export type PlansConfig = {
  A: PlanConfig
  B: PlanConfig
  C: PlanConfig
}

export const DEFAULT_PLAN_CONFIG: Record<PlanType, PlanConfig> = {
  A: {
    enabled: true, name: 'Tracker', description: '',
    monthly: 99, semi_annual: 534, annual: 948,
    discount_active: false, discount_percent: 0, discount_label: '', discount_expiry: null,
    features: ['Workout logging', 'Sets & reps tracking', 'Session history'],
  },
  B: {
    enabled: true, name: 'Tracker + Journal', description: '',
    monthly: 149, semi_annual: 804, annual: 1428,
    discount_active: false, discount_percent: 0, discount_label: '', discount_expiry: null,
    features: ['Everything in Plan A', 'Daily journal (sleep, steps, cardio, mood)', 'Recovery insights'],
  },
  C: {
    enabled: true, name: 'Ultimate', description: '',
    monthly: 279, semi_annual: 1494, annual: 2628,
    discount_active: false, discount_percent: 0, discount_label: '', discount_expiry: null,
    features: ['Everything in Plan B', 'Nutrition tracking', 'Recovery dashboard', 'Personal consultation'],
  },
}

export type HeroRequestStatus = 'pending' | 'approved' | 'declined' | 'payment_pending' | 'active'
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'athlete'

export interface HeroRequest {
  id: string
  coach_id: string
  plan_type: PlanType
  plan_billing: PlanBilling
  status: HeroRequestStatus
  full_name: string
  email: string
  phone: string
  age: number
  gender: 'male' | 'female'
  weight?: number
  height?: number
  goal?: string
  experience_level?: ExperienceLevel
  training_days_per_week?: number
  injuries?: string
  allergies?: string
  medications?: string
  sleep_average?: number
  steps_target?: number
  notes?: string
  terms_accepted: boolean
  privacy_accepted: boolean
  health_consent: boolean
  consent_timestamp?: string
  decline_reason?: string
  linked_hero_id?: string
  created_at: string
  updated_at: string
}

export type NotificationType =
  | 'hero_request_received'
  | 'request_approved'
  | 'request_declined'
  | 'payment_pending'
  | 'plan_activated'
  | 'system'

export interface Notification {
  id: string
  user_id: string
  title: string
  body?: string
  type: NotificationType
  read: boolean
  created_at: string
}

export interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  kind: ExerciseKind
  video_url?: string
  instructions?: string
}

export interface Bundle {
  id: string
  client_id: string
  name: string
  color: string
  description?: string
  created_by: string
  sort_order: number
  created_at: string
}

export interface BundleExercise {
  id: string
  bundle_id: string
  exercise_id: string
  sets: number
  reps: string
  sort_order: number
  exercise?: Exercise
}

export interface PlanSchedule {
  id: string
  client_id: string
  day_index: number
  bundle_id?: string
  bundle?: Bundle
}

export interface Session {
  id: string
  user_id: string
  bundle_id?: string
  bundle_name: string
  session_type?: 'workout' | 'rest'
  notes?: string
  logged_at: string
  created_at: string
  updated_at: string
  sets?: SessionSet[]
}

export interface SessionSet {
  id: string
  session_id: string
  exercise_id: string
  exercise_name: string
  set_number: number
  weight?: number
  reps?: number
  done: boolean
  created_at: string
}

export interface JournalLog {
  id: string
  user_id: string
  logged_at: string
  steps_done?: boolean
  sleep_hours?: number
  sleep_quality?: SleepQuality
  cardio_done?: boolean
  cardio_type?: CardioType
  cardio_duration?: number
  water_glasses?: number
  mood?: Mood
  soreness?: Soreness
  body_weight?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface NutritionIngredient {
  item: string
  amount: string
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
}

export interface NutritionTotals {
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
}

export interface NutritionLog {
  id: string
  user_id: string
  logged_at: string
  meal_name?: string
  raw_text: string
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber: number
  breakdown: NutritionIngredient[]
  is_favourite: boolean
  favourite_name?: string
  created_at: string
}

// Plan pricing
export const PLAN_PRICES: Record<PlanType, Record<PlanBilling, number>> = {
  A: { monthly: 99,  semi_annual: 534,  annual: 948  },
  B: { monthly: 149, semi_annual: 804,  annual: 1428 },
  C: { monthly: 279, semi_annual: 1494, annual: 2628 },
}

export const PLAN_NAMES: Record<PlanType, string> = {
  A: 'Fixed Tracker',
  B: 'Tracker + Journal',
  C: 'Ultimate',
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
