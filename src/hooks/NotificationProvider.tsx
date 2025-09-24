import React, { createContext, useContext, ReactNode } from 'react';
import { useNotification } from './useNotification';

interface NotificationContextType {
    notification: ReturnType<typeof useNotification>['notification'];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const { contextHolder, notification } = useNotification();

    return (
        <NotificationContext.Provider value={{ notification }}>
            {contextHolder}
            {children}
        </NotificationContext.Provider>
    );
};

export const useGlobalNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useGlobalNotification must be used within a NotificationProvider');
    }
    return context.notification;
};

export default NotificationProvider;
