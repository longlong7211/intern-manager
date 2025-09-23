import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import { authenticateUser, ApiResponse } from '../../../../../lib/middleware';
import { NotificationService } from '../../../../../services/businessService';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        await connectToDatabase();

        const notification = await NotificationService.markAsRead(params.id);

        if (!notification) {
            return ApiResponse.notFound('Notification not found');
        }

        // Check if user owns this notification
        if (notification.user_id !== authRequest.user.userId) {
            return ApiResponse.forbidden('You can only mark your own notifications as read');
        }

        return Response.json(ApiResponse.success(notification, 'Notification marked as read'));

    } catch (error) {
        console.error('Mark notification as read error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to mark notification as read');
    }
}
