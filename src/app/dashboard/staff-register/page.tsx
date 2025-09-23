import DashboardLayout from '@/components/DashboardLayout';
import StaffRegisterStudent from '@/components/StaffRegisterStudent';

export default function StaffRegisterPage() {
    return (
        <DashboardLayout selectedKey="staff-register">
            <StaffRegisterStudent />
        </DashboardLayout>
    );
}
