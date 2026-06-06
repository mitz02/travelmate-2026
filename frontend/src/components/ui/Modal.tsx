import React from 'react';
import ReactDOM from 'react-dom/client';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export const ModalHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2 text-lg font-medium">{children}</div>
);

export const ModalBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-2">{children}</div>
);

export const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-end gap-2">{children}</div>
);
