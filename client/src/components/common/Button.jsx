import React from 'react';

export const Button = ({ icon, bgColor, onClick, disabled, value }) => {

  return (
    <button 
        className={`btn border shadow-md ${bgColor} p-4 rounded-full text-white hover:scale-105 cursor-pointer transition-all duration-300 active:translate-y-2 disabled:bg-gray-500 disabled:hover:transition-none`}
        onClick={onClick}
        disabled={disabled}
        value={value}
    >{icon}</button>
  );
};
