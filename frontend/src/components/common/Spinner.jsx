import React from 'react';
import { BiLoaderAlt } from 'react-icons/bi';
import './Spinner.css';

export default function Spinner({ size = 'md', color = 'primary', className = '' }) {
  return (
    <div className={`spinner-container spinner-${size} spinner-${color} ${className}`}>
      <BiLoaderAlt className="animate-spin" />
    </div>
  );
}
