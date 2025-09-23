import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUnit extends Document {
    name: string;
    address?: string;
    contact_person?: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    is_active: boolean;
    managers?: Types.ObjectId[];  // Array of user IDs who manage this unit (L2 roles)
    created_at: Date;
    updated_at: Date;
}

const UnitSchema = new Schema<IUnit>({
    name: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    contact_person: {
        type: String,
        trim: true
    },
    contact_email: {
        type: String,
        lowercase: true,
        trim: true
    },
    contact_phone: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    managers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Text index for search
UnitSchema.index({ name: 'text', description: 'text' });
UnitSchema.index({ is_active: 1 });

// Clear the model if it exists to ensure schema updates are applied
if (mongoose.models.Unit) {
    delete mongoose.models.Unit;
}

export default mongoose.model<IUnit>('Unit', UnitSchema);
