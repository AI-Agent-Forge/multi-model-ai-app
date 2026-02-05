// Layout wrapper for Qwen Chat
import React from 'react';
import { QwenChatWindow } from './QwenChatWindow.tsx';

export const QwenChatLayout: React.FC = () => {
    return (
        <div className="flex h-full w-full bg-black">
            <QwenChatWindow />
        </div>
    );
};
