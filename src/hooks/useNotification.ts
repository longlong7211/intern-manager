import { notification } from 'antd';
import { ArgsProps } from 'antd/es/notification';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface NotificationConfig extends Omit<ArgsProps, 'type'> {
    type?: NotificationType;
}

export const useNotification = () => {
    const [api, contextHolder] = notification.useNotification();

    const showNotification = (config: NotificationConfig) => {
        const { type = 'info', ...restConfig } = config;

        const defaultConfig = {
            placement: 'topRight' as const,
            duration: 4.5,
            style: {
                marginTop: '60px', // Account for header
            },
            ...restConfig,
        };

        switch (type) {
            case 'success':
                api.success(defaultConfig);
                break;
            case 'error':
                api.error(defaultConfig);
                break;
            case 'warning':
                api.warning(defaultConfig);
                break;
            case 'info':
            default:
                api.info(defaultConfig);
                break;
        }
    };

    const success = (config: Omit<NotificationConfig, 'type'>) => {
        showNotification({ ...config, type: 'success' });
    };

    const error = (config: Omit<NotificationConfig, 'type'>) => {
        showNotification({ ...config, type: 'error' });
    };

    const warning = (config: Omit<NotificationConfig, 'type'>) => {
        showNotification({ ...config, type: 'warning' });
    };

    const info = (config: Omit<NotificationConfig, 'type'>) => {
        showNotification({ ...config, type: 'info' });
    };

    const destroy = (key?: string) => {
        if (key) {
            api.destroy(key);
        } else {
            api.destroy();
        }
    };

    return {
        contextHolder,
        notification: {
            success,
            error,
            warning,
            info,
            destroy,
            show: showNotification,
        }
    };
};

export default useNotification;
