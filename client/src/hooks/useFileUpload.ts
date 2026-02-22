import { useState } from 'react';

export const useFileUpload = () => {
    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            return data; // { url, name, type }
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    return { uploadFile, isUploading };
};
