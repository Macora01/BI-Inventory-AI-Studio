
import React, { useState, useCallback, useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  onFileProcess: (content: string, file: File) => Promise<void>;
  acceptedTypes?: string;
  title: string;
}

/**
 * Un componente reutilizable para subir y procesar archivos.
 * Muestra un área para seleccionar archivos y un botón para iniciar el procesamiento.
 * @param {FileUploadProps} props - Propiedades del componente.
 */
const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess, acceptedTypes = '.csv', title }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      // Llama a la función de procesamiento pasada como prop.
      await onFileProcess(content, file);
      setFile(null); // Resetea el estado del archivo después de procesar.
      if(fileInputRef.current) fileInputRef.current.value = ""; // Limpia el input de archivo.
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, [file, onFileProcess]);
  
  // Función para activar el input de archivo oculto.
  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="border-2 border-dashed border-accent rounded-lg p-6 text-center">
      <UploadCloud className="mx-auto h-12 w-12 text-text-light" />
      <h3 className="mt-2 text-sm font-medium text-text-main">{title}</h3>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptedTypes}
        className="hidden" // El input está oculto, se activa con el botón.
      />
      {!file && (
        <Button onClick={triggerFileSelect} className="mt-4">
          Seleccionar Archivo
        </Button>
      )}

      {file && (
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between p-2 bg-background rounded-md">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-primary mr-2" />
              <span className="text-sm text-text-main">{file.name}</span>
            </div>
            <Button onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? 'Procesando...' : 'Procesar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;