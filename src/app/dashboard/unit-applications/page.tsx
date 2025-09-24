'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import UnitApplications from '../../../components/UnitApplications';

const UnitApplicationsPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="unit-applications">
            <UnitApplications />
        </DashboardLayout>
    );
};

export default UnitApplicationsPage;
