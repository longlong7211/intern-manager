'use client';

import React from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import StudentList from '../../../components/StudentList';

const StudentsPage: React.FC = () => {
    return (
        <DashboardLayout selectedKey="students">
            <StudentList />
        </DashboardLayout>
    );
};

export default StudentsPage;
