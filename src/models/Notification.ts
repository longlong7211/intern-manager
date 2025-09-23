import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    user_id: string;
    type: string;
    title: string;
    body: string;
    is_read: boolean;
    created_at: Date;
    updated_at: Date;
}

const NotificationSchema = new Schema<INotification>({
    user_id: {
        type: String,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true,
        trim: true
    },
    is_read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
