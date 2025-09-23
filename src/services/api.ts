import axios from 'axios';
import { Intern, InternFormData } from '@/types';

const API_BASE_URL = '/api';

export const internService = {
    // Lấy tất cả interns
    getAllInterns: async (): Promise<Intern[]> => {
        const response = await axios.get(`${API_BASE_URL}/interns`);
        return response.data;
    },

    // Lấy intern theo ID
    getInternById: async (id: string): Promise<Intern> => {
        const response = await axios.get(`${API_BASE_URL}/interns/${id}`);
        return response.data;
    },

    // Tạo intern mới
    createIntern: async (internData: InternFormData): Promise<Intern> => {
        const response = await axios.post(`${API_BASE_URL}/interns`, internData);
        return response.data;
    },

    // Cập nhật intern
    updateIntern: async (id: string, internData: Partial<InternFormData>): Promise<Intern> => {
        const response = await axios.put(`${API_BASE_URL}/interns/${id}`, internData);
        return response.data;
    },

    // Xóa intern
    deleteIntern: async (id: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/interns/${id}`);
    },
};

// Cấu hình axios interceptors để xử lý lỗi
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);
