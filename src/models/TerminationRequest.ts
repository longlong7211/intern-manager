import mongoose, { Schema, Document } from 'mongoose';
import { TerminationStatus } from '../types';

export interface ITerminationRequest extends Document {
    internship_id: string;
    requested_by: string;
    reason?: string;
    status: TerminationStatus;
    processed_by?: string;
    processed_at?: Date;
    comment?: string;
    created_at: Date;
    updated_at: Date;
}

const TerminationRequestSchema = new Schema<ITerminationRequest>({
    internship_id: {
        type: String,
        ref: 'Internship',
        required: true
    },
    requested_by: {
        type: String,
        ref: 'User',
        required: true
    },
    reason: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: Object.values(TerminationStatus),
        default: TerminationStatus.PENDING
    },
    processed_by: {
        type: String,
        ref: 'User'
    },
    processed_at: Date,
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
TerminationRequestSchema.index({ internship_id: 1 });
TerminationRequestSchema.index({ status: 1, created_at: -1 });

export default mongoose.models.TerminationRequest || mongoose.model<ITerminationRequest>('TerminationRequest', TerminationRequestSchema);
