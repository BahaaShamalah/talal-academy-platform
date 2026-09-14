import { AUTH_COOKIE, getApiBaseUrl } from '@/lib/auth';

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type Subject = {
  id: number;
  name: string;
  description?: string | null;
  grades_count?: number;
};

export type Branch = {
  id: number;
  name: string;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  phone_1?: string | null;
  phone_2?: string | null;
  is_main?: boolean;
  halls_count?: number;
};

export type Hall = {
  id: number;
  branch_id: number;
  name: string;
  capacity: number;
  order?: number;
  branch?: Branch | null;
};

export type EducationalStage = {
  id: number;
  name: string;
  order: number;
  grades_count?: number;
};

export type Grade = {
  id: number;
  educational_stage_id: number;
  name: string;
  order: number;
  subjects_count?: number;
  educational_stage?: EducationalStage | null;
  subjects?: Subject[];
};

export type AcademicPeriodStatus =
  | 'draft'
  | 'registration_open'
  | 'active'
  | 'closed'
  | 'archived';

export type AcademicPeriod = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: AcademicPeriodStatus;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SubjectSelectionMode =
  | 'all_subjects'
  | 'single_subject'
  | 'choose_subjects'
  | 'none';

export type ProductType = {
  id: number;
  key: string;
  name_ar: string;
  name_en?: string | null;
  description?: string | null;
  subject_selection_mode: SubjectSelectionMode;
  requires_grade: boolean;
  is_schedulable: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PlanDurationStatus = 'upcoming' | 'active' | 'expired';
export type PlanDurationType = 'monthly_recurring' | 'fixed_period';

export type PlanDurationPeriod = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PlanDurationStatus;
  created_at?: string;
  updated_at?: string;
};

export type Plan = {
  id: number;
  product_type_id: number;
  grade_id: number | null;
  educational_stage_id?: number | null;
  period_id?: number | null;
  subject_id: number | null;
  subject_selection_count?: number | null;
  duration_period_id?: number | null;
  name: string;
  description?: string | null;
  duration_type: PlanDurationType;
  price: string | number;
  compare_at_price?: string | number | null;
  is_active: boolean;
  grade?: Grade | null;
  educational_stage?: { id: number; name: string } | null;
  subject?: Subject | null;
  period?: { id: number; name: string; status?: string } | null;
  product_type?: {
    id: number;
    name_ar: string;
    subject_selection_mode: SubjectSelectionMode;
    requires_grade?: boolean;
    is_schedulable?: boolean;
  } | null;
  duration_period?: PlanDurationPeriod | null;
  installment_template_id?: number | null;
  installment_template?: InstallmentTemplate | null;
};

export type InstallmentTemplate = {
  id: number;
  name: string;
  number_of_installments: number;
  split_percentages: number[];
  due_offset_days: number[];
  plans_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceInstallment = {
  id: number;
  invoice_id: number;
  sequence: number;
  amount: string | number;
  due_date?: string | null;
  status?: 'pending' | 'paid' | null;
  is_overdue?: boolean;
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  invoice?: {
    id: number;
    invoice_number: string;
    student?: { id: number; full_name: string; file_number?: string } | null;
  } | null;
};

export type TeacherUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_teaching_staff?: boolean;
  roles?: string[];
  taught_groups_count?: number;
  taught_class_offerings_count?: number;
  compensation_setting?: TeacherCompensationSetting | null;
  compensation_components?: StaffCompensationComponent[];
  staff_profile?: StaffProfile | null;
};

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_teaching_staff?: boolean;
  has_all_branch_access?: boolean;
  branches?: { id: number; name: string }[];
  roles?: string[];
  permissions?: string[];
  taught_groups_count?: number;
  compensation_components?: StaffCompensationComponent[];
  staff_profile?: StaffProfile | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminRole = {
  id: number;
  name: string;
  guard_name?: string;
  users_count?: number;
  permissions_count?: number;
  permissions?: string[];
  created_at?: string;
  updated_at?: string;
};

/** Grouped permissions from GET /permissions: { module: ['module.view', ...] } */
export type PermissionsGrouped = Record<string, string[]>;

export type CompensationType = 'fixed_monthly' | 'per_session' | 'manual' | 'composite';

export type CompensationComponentType =
  | 'base_salary'
  | 'per_session_rate'
  | 'fixed_incentive'
  | 'recurring_bonus';

export type StaffCompensationComponent = {
  id: number;
  user_id: number;
  component_type: CompensationComponentType;
  amount: string | number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TeacherCompensationSetting = {
  id?: number;
  teacher_id?: number;
  compensation_type: CompensationType;
  fixed_monthly_amount?: string | number | null;
  per_session_rate?: string | number | null;
};

export type ContractType = 'full_time' | 'part_time' | 'contractor';

export type StaffDocument = {
  id: number;
  staff_profile_id: number;
  media_id: number;
  document_type: string;
  uploaded_at?: string | null;
  media?: MediaItem | null;
};

export type StaffProfile = {
  id: number;
  user_id: number;
  civil_id?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  address?: string | null;
  job_title?: string | null;
  specialization?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  contract_type?: ContractType | null;
  notes?: string | null;
  expected_start_time?: string | null;
  expected_end_time?: string | null;
  qualifications?: {
    subjects?: { id: number; name: string }[];
    grades?: { id: number; name: string }[];
  };
  documents?: StaffDocument[];
};

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

export type StaffAttendanceRecord = {
  id: number;
  user_id: number;
  date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: StaffAttendanceStatus;
  late_minutes?: number | null;
  overtime_minutes?: number | null;
  notes?: string | null;
  marked_by?: number | null;
  user?: { id: number; name: string; email?: string } | null;
  marker?: { id: number; name: string } | null;
};

export type StaffAttendanceSummary = {
  user_id: number;
  month: string;
  present_days: number;
  absent_days: number;
  late_days: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
};

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export type LeaveType = {
  id: number;
  name: string;
  default_annual_balance: number;
};

export type LeaveBalance = {
  id: number;
  user_id: number;
  leave_type_id: number;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  leave_type?: LeaveType | null;
};

export type LeaveRequest = {
  id: number;
  user_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveRequestStatus;
  attachment_media_id?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  user?: {
    id: number;
    name: string;
    email?: string;
    is_teaching_staff?: boolean;
  } | null;
  leave_type?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
};

export type SubstituteSuggestionRow = {
  session: ClassSession;
  suggestions: { id: number; name: string; email?: string | null }[];
};

export type PayrollRunStatus = 'draft' | 'finalized';

export type PayrollItem = {
  id: number;
  payroll_run_id: number;
  teacher_id: number;
  compensation_type: CompensationType;
  sessions_count?: number | null;
  base_amount?: string | number | null;
  deductions: string | number;
  bonus: string | number;
  net_amount?: string | number | null;
  notes?: string | null;
  teacher?: { id: number; name: string } | null;
  payroll_run?: {
    id: number;
    period_month: string;
    status: PayrollRunStatus;
  } | null;
};

export type PayrollRun = {
  id: number;
  period_month: string;
  status: PayrollRunStatus;
  created_by: number;
  finalized_at?: string | null;
  finalized_by?: number | null;
  grand_total?: number | null;
  items?: PayrollItem[];
  created_at?: string;
  updated_at?: string;
};

export type ClassOfferingStatus = 'active' | 'closed';

export type ClassSchedule = {
  id: number;
  class_offering_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type ClassOfferingGender = 'male' | 'female';

export type GradeSection = {
  id: number;
  grade_id: number;
  period_id?: number | null;
  name: string;
  gender?: ClassOfferingGender | null;
  capacity?: number | null;
  status: ClassOfferingStatus;
  grade?: Grade | null;
  period?: { id: number; name: string; status?: string } | null;
  class_offerings_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type ClassOffering = {
  id: number;
  grade_id: number;
  grade_section_id?: number | null;
  subject_id: number;
  teacher_id: number;
  hall_id: number;
  period_id?: number | null;
  gender?: ClassOfferingGender | null;
  status: ClassOfferingStatus;
  grade?: Grade | null;
  grade_section?: GradeSection | null;
  subject?: Subject | null;
  teacher?: TeacherUser | null;
  hall?: Hall | null;
  period?: { id: number; name: string; status?: string } | null;
  schedules?: ClassSchedule[];
  active_students_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type EnrollmentStatus =
  | 'pending_payment'
  | 'active'
  | 'suspended'
  | 'completed'
  | 'cancelled';

export type Enrollment = {
  id: number;
  student_id: number;
  class_offering_id: number;
  status: EnrollmentStatus;
  enrolled_at?: string | null;
  created_by?: number | null;
  student?: Student | null;
  class_offering?: ClassOffering | null;
  created_at?: string;
  updated_at?: string;
};

export type ClassSessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type ClassSession = {
  id: number;
  class_offering_id: number;
  class_schedule_id?: number | null;
  teacher_id?: number | null;
  hall_id?: number | null;
  session_date: string;
  start_time: string;
  end_time: string;
  status: ClassSessionStatus;
  needs_substitute?: boolean;
  class_offering?: {
    id: number;
    grade_name?: string | null;
    label?: string;
  } | null;
  enrolled_count?: number;
  marked_count?: number;
  present_count?: number;
  absent_count?: number;
};

export type SessionRosterRow = {
  student: { id: number; full_name: string; file_number: string };
  enrollment_id: number;
  attendance: {
    id: number;
    student_id: number;
    status: AttendanceStatus;
    notes?: string | null;
  } | null;
};

export type SessionRosterResponse = {
  session: ClassSession;
  roster: SessionRosterRow[];
};

export type AttendanceSummary = {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_rate: number;
};

export type AttendanceBoardStudent = {
  id: number;
  full_name: string;
  file_number: string;
  status: AttendanceStatus | 'mixed' | null;
  sessions: {
    id: number;
    subject_name?: string | null;
    start_time?: string | null;
    status: AttendanceStatus | null;
  }[];
};

export type AttendanceBoardSection = {
  group_key?: string;
  grade_section_id: number | null;
  grade_section_name: string;
  grade_id: number | null;
  grade_name?: string | null;
  stage_id?: number | null;
  stage_name?: string | null;
  gender?: string | null;
  subjects: string[];
  session_ids: number[];
  has_sessions_today?: boolean;
  students: AttendanceBoardStudent[];
};

export type AttendanceBoardResponse = {
  date: string;
  scoped_to_teacher?: boolean;
  sections: AttendanceBoardSection[];
};

export type Gender = 'male' | 'female';

export type StudentStatus = 'active' | 'inactive' | 'graduated';

export type GuardianRelationship = 'أب' | 'أم' | 'ولي أمر آخر';

export type Guardian = {
  id: number;
  full_name: string;
  civil_id?: string | null;
  phone: string;
  phone_secondary?: string | null;
  email?: string | null;
  relationship?: GuardianRelationship | null;
  address?: string | null;
  students_count?: number;
};

export type Student = {
  id: number;
  file_number: string;
  civil_id?: string | null;
  full_name: string;
  gender?: Gender | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  address?: string | null;
  previous_school?: string | null;
  current_grade_id?: number | null;
  guardian_id?: number | null;
  photo_path?: string | null;
  status?: StudentStatus | null;
  notes?: string | null;
  guardian?: Guardian | null;
  current_grade?: {
    id: number;
    name: string;
    educational_stage_id?: number;
    educational_stage?: { id: number; name: string } | null;
  } | null;
  enrollments?: Enrollment[];
  enrollments_count?: number;
};

export type InvoiceStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'manual_transfer' | 'online';
export type SubscriptionStatus = 'pending_payment' | 'active' | 'frozen' | 'expired' | 'cancelled';

export type InvoiceItem = {
  id: number;
  invoice_id: number;
  itemable_type: string;
  itemable_id: number;
  description: string;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  student_id: number;
  coupon_id?: number | null;
  status?: InvoiceStatus | null;
  can_pay_online?: boolean;
  has_installments?: boolean;
  subtotal: string | number;
  coupon_discount_amount?: string | number | null;
  family_discount_percentage?: string | number | null;
  family_discount_amount?: string | number | null;
  credit_applied_amount?: string | number | null;
  discount_amount?: string | number;
  total: string | number;
  payment_method?: PaymentMethod | null;
  paid_at?: string | null;
  created_by: number;
  notes?: string | null;
  student?: { id: number; full_name: string; file_number: string } | null;
  coupon?: {
    id: number;
    code: string;
    type?: CouponType | null;
    value?: string | number | null;
  } | null;
  items?: InvoiceItem[];
  installments?: InvoiceInstallment[];
  created_at?: string;
  updated_at?: string;
};

export type CouponType = 'percentage' | 'fixed';
export type CouponScope = 'all' | 'specific_grade' | 'specific_plan';

export type Coupon = {
  id: number;
  code: string;
  type: CouponType;
  value: string | number;
  scope: CouponScope;
  grade_id?: number | null;
  plan_id?: number | null;
  max_uses?: number | null;
  used_count?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  min_purchase_amount?: string | number | null;
  is_active: boolean;
  grade?: { id: number; name: string } | null;
  plan?: { id: number; name: string } | null;
};

export type CouponValidateResult = {
  valid: boolean;
  discount_amount: number | null;
  message: string;
};

export type FamilyDiscountRule = {
  id: number;
  min_children_count: number;
  discount_percentage: string | number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Subscription = {
  id: number;
  student_id: number;
  plan_id: number;
  invoice_id: number;
  status?: SubscriptionStatus | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cancelled_at?: string | null;
  plan?: {
    id: number;
    name: string;
    duration_type?: PlanDurationType | null;
    duration_period_id?: number | null;
  } | null;
  invoice?: {
    id: number;
    invoice_number: string;
    status?: InvoiceStatus | null;
  } | null;
  created_at?: string;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: string | number;
  stock_quantity: number;
  image_media_id?: number | null;
  image_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type DeliveryZone = {
  id: number;
  name: string;
  fee: string | number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type FulfillmentType = 'delivery' | 'pickup';

export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type StoreOrder = {
  id: number;
  student_id: number;
  invoice_id: number;
  fulfillment_type: FulfillmentType;
  delivery_zone_id?: number | null;
  delivery_address?: string | null;
  branch_id?: number | null;
  status: OrderStatus;
  student?: { id: number; full_name: string; file_number: string } | null;
  invoice?: Invoice | null;
  delivery_zone?: { id: number; name: string; fee: string | number } | null;
  branch?: { id: number; name: string } | null;
  items?: {
    id: number;
    product_id: number;
    product_name: string;
    unit_price: string | number;
    quantity: number;
    line_total: string | number;
  }[];
  created_at?: string;
  updated_at?: string;
};

export type ContactMessageStatus = 'new' | 'replied' | 'closed';

export type ContactMessage = {
  id: number;
  name: string;
  phone: string;
  phone_secondary?: string | null;
  whatsapp?: string | null;
  whatsapp_secondary?: string | null;
  educational_stage_id?: number | null;
  message?: string | null;
  status: ContactMessageStatus;
  admin_notes?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  educational_stage?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type PrivateLessonOfferStatus = 'active' | 'inactive';
export type PrivateLessonSessionType = 'individual' | 'group';
export type PrivateLessonInquiryStatus = 'new' | 'accepted' | 'closed';

export type PrivateLessonInquiry = {
  id: number;
  student_name: string;
  phone: string;
  phone_secondary: string;
  grade_id: number;
  subject_id: number;
  hours: number;
  status: PrivateLessonInquiryStatus;
  admin_notes?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type PrivateLessonBookingStatus =
  | 'pending_coordination'
  | 'pending_payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type PrivateLessonSlot = {
  id: number;
  private_lesson_offer_id: number;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  available_spots?: number;
  created_at?: string;
  updated_at?: string;
};

export type PrivateLessonOffer = {
  id: number;
  grade_id: number;
  subject_id: number;
  teacher_id: number;
  duration_minutes: number;
  session_type: PrivateLessonSessionType;
  price: string | number;
  max_students: number | null;
  status: PrivateLessonOfferStatus;
  image_media_id?: number | null;
  image_url?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
  teacher?: { id: number; name: string } | null;
  slots?: PrivateLessonSlot[];
  slots_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type PrivateLessonBooking = {
  id: number;
  private_lesson_slot_id: number | null;
  private_lesson_offer_id: number;
  student_id: number;
  invoice_id: number | null;
  status: PrivateLessonBookingStatus;
  preferred_period_name?: string | null;
  preferred_start_time?: string | null;
  preferred_end_time?: string | null;
  offer?: PrivateLessonOffer | null;
  slot?: PrivateLessonSlot | null;
  invoice?: Invoice | null;
  student?: {
    id: number;
    full_name: string;
    file_number: string;
    phone?: string | null;
    contact_phone?: string | null;
    guardian?: {
      id: number;
      full_name: string;
      phone?: string | null;
      phone_secondary?: string | null;
    } | null;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type InstituteSetting = {
  id: number;
  institute_name_ar: string;
  institute_name_en?: string | null;
  logo_media_id?: number | null;
  logo_url?: string | null;
  stamp_media_id?: number | null;
  stamp_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  commercial_registration_number?: string | null;
  invoice_footer_note?: string | null;
  director_name?: string | null;
  private_lesson_periods?: PrivateLessonPeriod[];
  updated_at?: string;
};

export type PrivateLessonPeriod = {
  id: string;
  name_ar: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

export type MediaItem = {
  id: number;
  uuid: string;
  original_filename: string;
  disk: string;
  path: string;
  url: string;
  mime_type: string;
  width?: number | null;
  height?: number | null;
  size_bytes: number;
  alt_text?: string | null;
  uploaded_by?: number | null;
  created_at?: string;
};

export type MarketingSection = {
  id: number;
  section_key: string;
  content: Record<string, unknown>;
  is_active: boolean;
  display_order?: number | null;
  updated_at?: string;
};

export type StatementEventType =
  | 'invoice_issued'
  | 'payment_received'
  | 'refund_issued'
  | 'credit_adjustment';

export type StatementEvent = {
  date: string;
  type: StatementEventType;
  description: string;
  student_name: string | null;
  amount: string;
  payment_method?: string | null;
  refund_method?: string | null;
};

export type StatementSummary = {
  total_invoiced: string;
  total_paid: string;
  total_outstanding: string;
  total_refunded: string;
  current_credit_balance: string;
};

export type GuardianStatement = {
  events: StatementEvent[];
  summary: StatementSummary;
};

export type EvaluationLevelRating = 'excellent' | 'good' | 'needs_follow_up';

export type Evaluation = {
  id: number;
  student_id: number;
  class_offering_id: number;
  class_session_id?: number | null;
  numeric_score?: string | number | null;
  numeric_score_max?: string | number | null;
  level_rating?: EvaluationLevelRating | null;
  participation_rating?: number | null;
  understanding_rating?: number | null;
  homework_rating?: number | null;
  discipline_rating?: number | null;
  note?: string | null;
  created_by?: number | null;
  class_offering?: ClassOffering | null;
  student?: { id: number; full_name: string; file_number?: string | null } | null;
  creator?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type TeachingScheduleView = 'day' | 'week' | 'month';

export type TeachingScheduleSession = {
  id: number;
  session_date: string;
  day_name: string;
  start_time: string | null;
  end_time: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  hall_name?: string | null;
  status: string;
  class_offering_id?: number;
};

export type TeachingSchedulePayload = {
  sessions: TeachingScheduleSession[];
  meta: {
    view: TeachingScheduleView;
    range_start: string;
    range_end: string;
  };
};

export type EducationalMaterialScope = 'general' | 'targeted';

export type EducationalMaterial = {
  id: number;
  title: string;
  description?: string | null;
  media_id: number;
  scope: EducationalMaterialScope;
  grade_id?: number | null;
  subject_id?: number | null;
  student_id?: number | null;
  class_offering_id?: number | null;
  period_id: number;
  uploaded_by?: number | null;
  media?: MediaItem | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
  student?: { id: number; full_name: string } | null;
  period?: { id: number; name: string } | null;
  uploader?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type Exam = {
  id: number;
  name: string;
  exam_date: string;
  class_offering_id: number;
  max_score: string | number;
  period_id: number;
  created_by?: number | null;
  class_offering?: ClassOffering | null;
  period?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type ExamResultRow = {
  student: { id: number; full_name: string; file_number: string };
  enrollment_id: number;
  result: {
    id: number;
    exam_id: number;
    student_id: number;
    score?: string | number | null;
    teacher_notes?: string | null;
  } | null;
};

export type ExamResultsResponse = {
  exam: Exam;
  roster: ExamResultRow[];
};

export type SubscriptionFreeze = {
  id: number;
  student_plan_subscription_id: number;
  start_date: string;
  end_date?: string | null;
  reason: string;
  pauses_installments: boolean;
  pauses_attendance_expectation: boolean;
  extends_subscription: boolean;
  previous_status: string;
  status: 'active' | 'ended';
  created_by?: number | null;
  creator?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type AbsenceAlertLevel = 'notice' | 'follow_up';

export type AbsenceAlertThreshold = {
  id: number;
  consecutive_absences_count: number;
  alert_level: AbsenceAlertLevel;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type SupportTicketStatus = 'new' | 'in_progress' | 'replied' | 'closed';
export type SupportTicketSenderType = 'guardian' | 'staff';

export type SupportTicketMessage = {
  id: number;
  ticket_id: number;
  sender_type: SupportTicketSenderType;
  sender_guardian_id?: number | null;
  sender_user_id?: number | null;
  message: string;
  sender_guardian?: { id: number; full_name: string } | null;
  sender_user?: { id: number; name: string } | null;
  created_at?: string;
};

export type SupportTicket = {
  id: number;
  guardian_id: number;
  student_id?: number | null;
  subject: string;
  status: SupportTicketStatus;
  assigned_to?: number | null;
  guardian?: { id: number; full_name: string; phone?: string | null } | null;
  student?: { id: number; full_name: string } | null;
  assignee?: { id: number; name: string } | null;
  messages?: SupportTicketMessage[];
  created_at?: string;
  updated_at?: string;
};

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationTemplate = {
  id: number;
  event_key: string;
  name_ar: string;
  channel: NotificationChannel;
  subject?: string | null;
  body_template: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AppNotification = {
  id: number;
  event_key: string;
  channel: NotificationChannel | string;
  subject?: string | null;
  body: string;
  meta?: {
    booking_id?: number;
    action_url?: string;
    [key: string]: unknown;
  } | null;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string;
};

export type AuditLog = {
  id: number;
  action: string;
  description: string;
  subject_type: string;
  subject_id: number;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  user?: { id: number; name: string; email?: string } | null;
  guardian?: { id: number; name: string; phone?: string | null } | null;
  user_id?: number | null;
  guardian_id?: number | null;
  created_at?: string;
};

export type AbsenceAlert = {
  id: number;
  student_id: number;
  class_offering_id: number;
  consecutive_count: number;
  alert_level: AbsenceAlertLevel;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  student?: { id: number; full_name: string; file_number?: string } | null;
  class_offering?: ClassOffering | null;
  acknowledger?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
};

export type RevenuePeriodRow = {
  period: string;
  total: string;
};

export type RevenueByMethodRow = {
  payment_method: string | null;
  total: string;
};

export type OutstandingStudentRow = {
  student_id: number;
  student_name: string;
  outstanding_amount: string;
  pending_invoices: number;
  pending_installments: number;
};

export function formatKwd(amount: string | number | null | undefined): string {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} د.ك`;
}

export function productImageSrc(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/')) return imageUrl;
  return `${getApiBaseUrl()}/storage/${imageUrl}`;
}

export class ApiError extends Error {
  status: number;
  usedIn?: string[];

  constructor(message: string, status: number, usedIn?: string[]) {
    super(message);
    this.status = status;
    this.usedIn = usedIn;
  }
}

export function friendlyError(status: number, fallback?: string): string {
  if (status === 400) return fallback || 'البيانات المرسلة غير صحيحة.';
  if (status === 401) return 'انتهت الجلسة، يرجى تسجيل الدخول مجددًا.';
  if (status === 403) return fallback || 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
  if (status === 404) return 'العنصر المطلوب غير موجود.';
  if (status === 409) return fallback || 'تعارض في البيانات، تعذر إكمال العملية.';
  if (status === 422) return fallback || 'تحقق من الحقول المدخلة.';
  if (status >= 500) return 'حدث خطأ في الخادم، حاول لاحقًا.';
  return fallback || 'تعذر إكمال العملية.';
}

export function unwrapResource<T>(json: unknown): T {
  if (
    json &&
    typeof json === 'object' &&
    'data' in json &&
    (json as { data: unknown }).data !== null &&
    typeof (json as { data: unknown }).data === 'object' &&
    !Array.isArray((json as { data: unknown }).data)
  ) {
    return (json as { data: T }).data;
  }

  return json as T;
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`/api/proxy${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const raw =
      json?.message ??
      (json?.errors ? (Object.values(json.errors).flat()[0] as string) : undefined);
    const usedIn = Array.isArray(json?.used_in) ? (json.used_in as string[]) : undefined;
    const msg =
      usedIn && usedIn.length > 0
        ? `${friendlyError(res.status, raw)} — ${usedIn.join('، ')}`
        : friendlyError(res.status, raw);
    throw new ApiError(msg, res.status, usedIn);
  }

  return unwrapResource<T>(json);
}

export function qs(params: Record<string, string | number | undefined | null | boolean>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      sp.set(k, String(v));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Used only by server routes — re-export helpers for convenience */
export { AUTH_COOKIE, getApiBaseUrl };
