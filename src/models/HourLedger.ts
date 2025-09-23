import mongoose, { Schema, Document } from 'mongoose';
import { ApproverRole } from '../types';

export interface IHourLedger extends Document {
    internship_id: string;
    hours: number;
    reason: string;
    approved_by: string;
    approver_role: ApproverRole;
    scope_date?: Date;
    tags?: string[];
    created_at: Date;
    updated_at?: Date;
}

const HourLedgerSchema = new Schema<IHourLedger>({
    internship_id: {
        type: String,
        ref: 'Internship',
        required: true
    },
    hours: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    approved_by: {
        type: String,
        ref: 'User',
        required: true
    },
    approver_role: {
        type: String,
        enum: Object.values(ApproverRole),
        required: true
    },
    scope_date: Date,
    tags: [String]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
HourLedgerSchema.index({ internship_id: 1, created_at: -1 });
HourLedgerSchema.index({ approver_role: 1, approved_by: 1, created_at: -1 });
HourLedgerSchema.index({ scope_date: 1 });
HourLedgerSchema.index({ tags: 1 });

export default mongoose.models.HourLedger || mongoose.model<IHourLedger>('HourLedger', HourLedgerSchema);
