
import React from 'react';

// Define las propiedades que puede recibir el componente Button,
// extendiendo las propiedades de un botón HTML estándar.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

/**
 * Un componente de Botón (Button) reutilizable con diferentes estilos (variantes).
 * @param {ButtonProps} props - Propiedades del componente.
 */
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  // Clases base aplicadas a todos los botones para un estilo consistente.
  const baseClasses = "px-4 py-2 rounded-md font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  // Clases específicas para cada variante de color del botón.
  const variantClasses = {
    primary: 'bg-primary hover:bg-opacity-90 focus:ring-primary',
    secondary: 'bg-secondary hover:bg-opacity-90 focus:ring-secondary',
    danger: 'bg-danger hover:bg-opacity-90 focus:ring-danger',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;