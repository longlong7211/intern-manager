import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    before?: any;
    after?: any;
    created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
    actor_id: {
        type: String,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    entity_type: {
        type: String,
        required: true
    },
    entity_id: {
        type: String,
        required: true
    },
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

// Indexes
AuditLogSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
AuditLogSchema.index({ actor_id: 1, created_at: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
