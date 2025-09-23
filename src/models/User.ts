import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
    email: string;
    username?: string;  // For student_code or staff username
    password_hash: string;
    full_name: string;
    role: UserRole | UserRole[];  // Support single role or multiple roles
    unit_id?: string;
    status: 'active' | 'inactive';
    created_at: Date;
    updated_at: Date;
}

const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true,  // Allows null values to be non-unique
        trim: true
    },
    password_hash: {
        type: String,
        required: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: Schema.Types.Mixed,  // Allows both single role and array of roles
        required: true,
        validate: {
            validator: function (value: UserRole | UserRole[]) {
                if (Array.isArray(value)) {
                    return value.every(role => Object.values(UserRole).includes(role));
                }
                return Object.values(UserRole).includes(value);
            },
            message: 'Invalid role(s)'
        }
    },
    unit_id: {
        type: String,
        ref: 'Unit',
        required: function (this: IUser) {
            return this.role === UserRole.L2;
        }
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ unit_id: 1, role: 1 });

// Clear the model if it exists to ensure schema updates are applied
if (mongoose.models.User) {
    delete mongoose.models.User;
}

export default mongoose.model<IUser>('User', UserSchema);
