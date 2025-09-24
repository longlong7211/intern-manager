'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import MyUnit from '../../../components/MyUnit';

const MyUnitPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="my-unit">
            <MyUnit />
        </DashboardLayout>
    );
};

export default MyUnitPage;
