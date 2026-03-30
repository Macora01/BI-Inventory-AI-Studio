import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border-2 border-danger">
            <h1 className="text-2xl font-bold text-danger mb-4">¡Ups! Algo salió mal.</h1>
            <p className="text-text-main mb-6">
              La aplicación ha encontrado un error inesperado. Esto suele ocurrir por problemas de conexión con la base de datos.
            </p>
            <div className="bg-background-light p-3 rounded text-left text-xs font-mono mb-6 overflow-auto max-h-40">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
