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

        // Only L2 reviewers can review at L2 level
        try {
            requireRole([UserRole.L2, UserRole.ADMIN])(authRequest.user);
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

        // Check if application can be reviewed at L2
        if (application.status !== ApplicationStatus.APPROVED_L1) {
            return ApiResponse.badRequest('Application is not in a reviewable state for L2');
        }

        // Check if L2 reviewer belongs to the target unit (unless admin)
        if (authRequest.user.role === UserRole.L2 &&
            authRequest.user.unitId !== application.target_unit_id) {
            return ApiResponse.forbidden('You can only review applications for your unit');
        }

        const updatedApplication = await ApplicationService.reviewApplicationL2(
            params.id,
            authRequest.user.userId,
            decision,
            comment
        );

        return Response.json(ApiResponse.success(updatedApplication, 'Application reviewed successfully'));

    } catch (error) {
        console.error('L2 review error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to review application');
    }
}
