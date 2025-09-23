import mongoose, { Schema, Document } from 'mongoose';

export interface IIntern extends Document {
    internship_period: string;
    full_name: string;
    student_id: string;
    class_name?: string;
    phone?: string;
    email: string;
    notes?: string;
    position?: string;
    department_feedback?: string;
    status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
    additional_notes?: string;
    created_at: Date;
    updated_at: Date;
}

const InternSchema: Schema = new Schema({
    internship_period: {
        type: String,
        required: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    student_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    class_name: {
        type: String,
        required: false,
        trim: true
    },
    phone: {
        type: String,
        required: false,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    notes: {
        type: String,
        required: false
    },
    position: {
        type: String,
        required: false,
        trim: true
    },
    department_feedback: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    additional_notes: {
        type: String,
        required: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Tạo index cho tìm kiếm
InternSchema.index({ full_name: 'text', email: 'text', student_id: 'text' });

export default mongoose.models.Intern || mongoose.model<IIntern>('Intern', InternSchema);
