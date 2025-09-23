import mongoose, { Schema, Document } from 'mongoose';
import { ApplicationStatus, INTERNSHIP_CONSTANTS, InternshipStatus } from '../types';

export interface IInternshipApplication extends Document {
    student_id: string;
    unit_id: string;
    position_title?: string;
    description?: string;
    expected_start_date?: Date;
    expected_total_hours?: number;
    status: ApplicationStatus;
    application_date?: Date;

    // Approval workflow
    approved_by_l1?: string;
    approved_by_l2?: string;
    l1_approval_date?: Date;
    l2_approval_date?: Date;
    comment_l1?: string;
    comment_l2?: string;

    // Staff registration tracking
    created_by_staff?: string;

    // Internship execution
    actual_start_date?: Date;
    internship_status?: string;
    internship_started_by?: string;
    internship_start_date?: Date;

    // Legacy fields (for backward compatibility)
    target_unit_id?: string;
    start_date_expected?: Date;
    end_date_expected?: Date;
    l1_reviewer_id?: string;
    l2_reviewer_id?: string;
    submitted_at?: Date;
    student_snapshot?: {
        full_name: string;
        student_code?: string;
    };
    unit_snapshot?: {
        name: string;
    };

    created_at: Date;
    updated_at: Date;
}

const InternshipApplicationSchema = new Schema<IInternshipApplication>({
    student_id: {
        type: String,
        ref: 'User',
        required: true
    },
    unit_id: {
        type: String,
        ref: 'Unit',
        required: true
    },
    position_title: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    expected_start_date: Date,
    expected_total_hours: {
        type: Number,
        default: INTERNSHIP_CONSTANTS.DEFAULT_HOURS,
        min: 100,
        max: 2000
    },
    status: {
        type: String,
        enum: Object.values(ApplicationStatus),
        default: ApplicationStatus.DRAFT
    },
    application_date: {
        type: Date,
        default: Date.now
    },

    // Approval workflow
    approved_by_l1: {
        type: String,
        ref: 'User'
    },
    approved_by_l2: {
        type: String,
        ref: 'User'
    },
    l1_approval_date: Date,
    l2_approval_date: Date,
    comment_l1: {
        type: String,
        trim: true
    },
    comment_l2: {
        type: String,
        trim: true
    },

    // Staff registration tracking
    created_by_staff: {
        type: String,
        ref: 'User'
    },

    // Internship execution
    actual_start_date: Date,
    internship_status: {
        type: String,
        enum: Object.values(InternshipStatus)
    },
    internship_started_by: {
        type: String,
        ref: 'User'
    },
    internship_start_date: Date,

    // Legacy fields (for backward compatibility)
    target_unit_id: {
        type: String,
        ref: 'Unit'
    },
    start_date_expected: Date,
    end_date_expected: Date,
    l1_reviewer_id: {
        type: String,
        ref: 'User'
    },
    l2_reviewer_id: {
        type: String,
        ref: 'User'
    },
    submitted_at: Date,
    student_snapshot: {
        full_name: String,
        student_code: String
    },
    unit_snapshot: {
        name: String
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
InternshipApplicationSchema.index({ student_id: 1, status: 1, updated_at: -1 });
InternshipApplicationSchema.index({ unit_id: 1, status: 1 });
InternshipApplicationSchema.index({ target_unit_id: 1, status: 1 }); // Legacy
InternshipApplicationSchema.index({ approved_by_l1: 1, status: 1 });
InternshipApplicationSchema.index({ approved_by_l2: 1, status: 1 });
InternshipApplicationSchema.index({ l1_reviewer_id: 1, status: 1 }); // Legacy
InternshipApplicationSchema.index({ l2_reviewer_id: 1, status: 1 }); // Legacy
InternshipApplicationSchema.index({ created_by_staff: 1 });
InternshipApplicationSchema.index({ application_date: -1 });

export default mongoose.models.InternshipApplication || mongoose.model<IInternshipApplication>('InternshipApplication', InternshipApplicationSchema);
