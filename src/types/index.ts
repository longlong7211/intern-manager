// Enums for application and internship status
export enum ApplicationStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    APPROVED_L1 = 'APPROVED_L1',
    REJECTED_L1 = 'REJECTED_L1',
    REVISION_REQUESTED_L1 = 'REVISION_REQUESTED_L1',
    APPROVED_L2 = 'APPROVED_L2',
    REJECTED_L2 = 'REJECTED_L2',
    REVISION_REQUESTED_L2 = 'REVISION_REQUESTED_L2',
    APPROVED_FINAL = 'APPROVED_FINAL'
}

export enum InternshipStatus {
    ACTIVE = 'ACTIVE',
    TERMINATION_REQUESTED = 'TERMINATION_REQUESTED',
    COMPLETED = 'COMPLETED'
}

export enum UserRole {
    STUDENT = 'STUDENT',
    L1 = 'L1',        // CBQL Bậc 1 (trường/khoa)
    L2 = 'L2',        // CBQL Bậc 2 (đơn vị)
    SUPERVISOR = 'SUPERVISOR',  // Cán bộ giám sát
    ADMIN = 'ADMIN'   // Quản trị hệ thống
}

export enum TerminationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export enum ApproverRole {
    L1 = 'L1',
    L2 = 'L2'
}

// Constants
export const INTERNSHIP_CONSTANTS = {
    DEFAULT_HOURS: 700,
    MIN_DURATION_MONTHS: 1,
    MAX_DURATION_MONTHS: 12,
    HOURS_PER_MONTH: 175, // Approximate hours per month (700/4 months average)
} as const;

// Base interfaces
export interface BaseEntity {
    _id?: string;
    created_at: Date;
    updated_at?: Date;
}

export interface User extends BaseEntity {
    email: string;
    password_hash: string;
    full_name: string;
    role: UserRole | UserRole[];  // Support multiple roles
    unit_id?: string;  // Only for L2 users
    status: 'active' | 'inactive';
}

export interface Unit extends BaseEntity {
    name: string;
    address?: string;
    contact_person?: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    is_active: boolean;
    managers?: string[];  // Array of user IDs who manage this unit
}

export interface StudentProfile extends BaseEntity {
    user_id: string;
    student_code: string;
    major?: string;
    phone?: string;
    cv_url?: string;
    note?: string;
}

export interface InternshipApplication extends BaseEntity {
    student_id: string;
    target_unit_id: string;
    position_title?: string;
    start_date_expected?: Date;
    end_date_expected?: Date;
    status: ApplicationStatus;
    l1_reviewer_id?: string;
    l2_reviewer_id?: string;
    comment_l1?: string;
    comment_l2?: string;
    submitted_at?: Date;
    // Snapshots for data integrity
    student_snapshot?: {
        full_name: string;
        student_code?: string;
    };
    unit_snapshot?: {
        name: string;
    };
}

export interface Internship extends BaseEntity {
    student_id: string;
    unit_id: string;
    application_id: string;
    status: InternshipStatus;
    start_date: Date;
    end_date?: Date;
    total_hours_cached: number;
    // Snapshots for data integrity
    student_snapshot?: {
        full_name: string;
        student_code?: string;
    };
    unit_snapshot?: {
        name: string;
    };
}

export interface HourLedger extends BaseEntity {
    internship_id: string;
    hours: number;  // Can be positive or negative
    reason: string;
    approved_by: string;
    approver_role: ApproverRole;
    scope_date?: Date;
    tags?: string[];
}

export interface TerminationRequest extends BaseEntity {
    internship_id: string;
    requested_by: string;
    reason?: string;
    status: TerminationStatus;
    processed_by?: string;
    processed_at?: Date;
    comment?: string;
}

export interface AuditLog extends BaseEntity {
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    before?: any;
    after?: any;
}

export interface Notification extends BaseEntity {
    user_id: string;
    type: string;
    title: string;
    body: string;
    is_read: boolean;
}

// API Request/Response types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    unit_id?: string;
}

export interface AuthResponse {
    user: Omit<User, 'password_hash'>;
    token: string;
}

export interface ApplicationReviewRequest {
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
    comment?: string;
}

export interface HourAdjustmentRequest {
    hours: number;
    reason: string;
    scope_date?: Date;
    tags?: string[];
}

export interface TerminationProcessRequest {
    approve: boolean;
    comment?: string;
}

// Legacy interface for backward compatibility
export interface Intern {
    _id: string;
    internship_period: string; // Đợt thực tập
    full_name: string; // Họ và tên
    student_id: string; // MSSV
    class_name?: string; // Lớp
    phone?: string; // SDT
    email: string; // Email
    notes?: string; // Ghi chú
    position?: string; // Vị trí
    department_feedback?: string; // Phản hồi từ bộ phận tiếp nhận thực tập
    status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'; // Trạng thái
    additional_notes?: string; // Ghi chú thêm
    created_at: string;
    updated_at: string;
}

export interface InternFormData {
    internship_period: string;
    full_name: string;
    student_id: string;
    class_name?: string;
    phone?: string;
    email: string;
    notes?: string;
    position?: string;
    department_feedback?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
    additional_notes?: string;
}
