import React from 'react';

interface BurgerMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const BurgerMenuButton: React.FC<BurgerMenuButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col justify-center items-center w-10 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      aria-controls="burger-menu"
    >
      <span className="sr-only">{isOpen ? 'Close menu' : 'Open menu'}</span>
      
      {/* Top line */}
      <span
        className={`block w-6 h-0.5 bg-gray-700 transition-all duration-300 ease-in-out ${
          isOpen ? 'rotate-45 translate-y-1.5' : ''
        }`}
      />
      
      {/* Middle line */}
      <span
        className={`block w-6 h-0.5 bg-gray-700 my-1 transition-all duration-300 ease-in-out ${
          isOpen ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Bottom line */}
      <span
        className={`block w-6 h-0.5 bg-gray-700 transition-all duration-300 ease-in-out ${
          isOpen ? '-rotate-45 -translate-y-1.5' : ''
        }`}
      />
    </button>
  );
};
