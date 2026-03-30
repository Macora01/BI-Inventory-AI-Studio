
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

/**
 * Un componente de Tarjeta (Card) reutilizable para mostrar secciones de contenido.
 * Proporciona un contenedor estilizado con sombra y bordes redondeados.
 * @param {CardProps} props - Propiedades del componente.
 */
const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-background-light rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {/* Si se proporciona un título, se renderiza en la parte superior de la tarjeta. */}
      {title && <h3 className="text-lg font-semibold text-text-main mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;