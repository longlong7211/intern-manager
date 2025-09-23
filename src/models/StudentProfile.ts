import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile extends Document {
    user_id: string;
    student_code: string;
    full_name?: string;
    email?: string;
    major?: string;
    phone?: string;
    class_name?: string;
    cv_url?: string;
    note?: string;
    created_at: Date;
    updated_at: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
    user_id: {
        type: String,
        ref: 'User',
        required: true,
        unique: true
    },
    student_code: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    full_name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    major: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    class_name: {
        type: String,
        trim: true
    },
    cv_url: {
        type: String,
        trim: true
    },
    note: {
        type: String,
        trim: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes removed - using unique: true in schema instead

export default mongoose.models.StudentProfile || mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
