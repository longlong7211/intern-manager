'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import UnitManagement from '../../../components/UnitManagement';

const UnitsPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="units">
            <UnitManagement />
        </DashboardLayout>
    );
};

export default UnitsPage;
