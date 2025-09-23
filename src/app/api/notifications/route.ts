import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import { authenticateUser, ApiResponse } from '../../../lib/middleware';
import { NotificationService } from '../../../services/businessService';

export async function GET(request: NextRequest) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        await connectToDatabase();

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');

        const notifications = await NotificationService.getUserNotifications(
            authRequest.user.userId,
            limit
        );

        return Response.json(ApiResponse.success(notifications));

    } catch (error) {
        console.error('Get notifications error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to fetch notifications');
    }
}
