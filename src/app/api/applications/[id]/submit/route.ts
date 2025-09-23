import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import InternshipApplication from '../../../../../models/InternshipApplication';
import { authenticateUser, ApiResponse, requireRole, requireNotReadOnly } from '../../../../../lib/middleware';
import { UserRole, ApplicationStatus } from '../../../../../types';
import { ApplicationService } from '../../../../../services/businessService';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only students can submit their own applications
        try {
            requireRole([UserRole.STUDENT])(authRequest.user);
            requireNotReadOnly()(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        const application = await InternshipApplication.findById(params.id);
        if (!application) {
            return ApiResponse.notFound('Application not found');
        }

        // Check if user owns this application
        if (application.student_id !== authRequest.user.userId) {
            return ApiResponse.forbidden('You can only submit your own applications');
        }

        // Check if application can be submitted
        if (application.status !== ApplicationStatus.DRAFT &&
            application.status !== ApplicationStatus.REVISION_REQUESTED_L1 &&
            application.status !== ApplicationStatus.REVISION_REQUESTED_L2) {
            return ApiResponse.badRequest('Application cannot be submitted in current status');
        }

        const updatedApplication = await ApplicationService.submitApplication(
            params.id,
            authRequest.user.userId
        );

        return Response.json(ApiResponse.success(updatedApplication, 'Application submitted successfully'));

    } catch (error) {
        console.error('Submit application error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to submit application');
    }
}
