import mongoose, { Schema, Document } from 'mongoose';
import { InternshipStatus } from '../types';

export interface IInternship extends Document {
    student_id: string;
    unit_id: string;
    application_id: string;
    status: InternshipStatus;
    start_date: Date;
    end_date?: Date;
    total_hours_cached: number;
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

const InternshipSchema = new Schema<IInternship>({
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
    application_id: {
        type: String,
        ref: 'InternshipApplication',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(InternshipStatus),
        default: InternshipStatus.ACTIVE
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: Date,
    total_hours_cached: {
        type: Number,
        default: 0
    },
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
InternshipSchema.index({ student_id: 1, status: 1 });
InternshipSchema.index({ unit_id: 1, status: 1 });
InternshipSchema.index({ created_at: -1 });

export default mongoose.models.Internship || mongoose.model<IInternship>('Internship', InternshipSchema);
