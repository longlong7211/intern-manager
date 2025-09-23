import { NextRequest } from 'next/server';
import { authenticateUser, ApiResponse } from '../../../../lib/middleware';

export async function GET(request: NextRequest) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        return Response.json(ApiResponse.success({
            user: authRequest.user
        }));

    } catch (error) {
        console.error('Get user error:', error);
        return ApiResponse.unauthorized('Invalid token');
    }
}
