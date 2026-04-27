import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold text-white">操作确认</h3>
          </div>
          <p className="text-zinc-300 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
