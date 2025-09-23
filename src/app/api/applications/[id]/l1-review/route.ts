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

        // Only L1 reviewers can review at L1 level
        try {
            requireRole([UserRole.L1, UserRole.ADMIN])(authRequest.user);
            requireNotReadOnly()(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        const body = await request.json();
        const { decision, comment } = body;

        // Validation
        if (!decision || !['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(decision)) {
            return ApiResponse.badRequest('Valid decision is required (APPROVED, REJECTED, REVISION_REQUESTED)');
        }

        const application = await InternshipApplication.findById(params.id);
        if (!application) {
            return ApiResponse.notFound('Application not found');
        }

        // Check if application can be reviewed at L1
        if (application.status !== ApplicationStatus.SUBMITTED) {
            return ApiResponse.badRequest('Application is not in a reviewable state for L1');
        }

        const updatedApplication = await ApplicationService.reviewApplicationL1(
            params.id,
            authRequest.user.userId,
            decision,
            comment
        );

        return Response.json(ApiResponse.success(updatedApplication, 'Application reviewed successfully'));

    } catch (error) {
        console.error('L1 review error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to review application');
    }
}
