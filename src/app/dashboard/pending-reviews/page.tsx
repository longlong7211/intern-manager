'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import PendingReviews from '../../../components/PendingReviews';

const PendingReviewsPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="pending-reviews">
            <PendingReviews />
        </DashboardLayout>
    );
};

export default PendingReviewsPage;
