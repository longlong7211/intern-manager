'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import InternshipApplication from '../../../components/InternshipApplication';

const ApplicationsPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="applications">
            <InternshipApplication />
        </DashboardLayout>
    );
};

export default ApplicationsPage;
