
import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Button from './Button';
import { useToast } from '../hooks/useToast';

interface BulkImageUploadProps {
  onSuccess?: () => void;
}

const BulkImageUpload: React.FC<BulkImageUploadProps> = ({ onSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{ success: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles(Array.from(event.target.files));
      setUploadResults(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload-bulk?type=product-bulk', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResults({ success: result.count, total: files.length });
        addToast(`Se subieron ${result.count} imágenes con éxito.`, 'success');
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (onSuccess) onSuccess();
      } else {
        addToast(result.error || 'Error al subir las imágenes.', 'error');
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      addToast('Error de red al subir las imágenes.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="border-2 border-dashed border-accent rounded-lg p-6 text-center bg-white">
      <UploadCloud className="mx-auto h-12 w-12 text-text-light" />
      <h3 className="mt-2 text-sm font-medium text-text-main">Subida Masiva de Fotos</h3>
      <p className="text-xs text-text-light mt-1 mb-4">
        Los archivos deben llamarse como el ID de Fábrica (ej: 2343.jpg)
      </p>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />

      {!isUploading && (
        <div className="space-y-4">
          <Button onClick={triggerFileSelect} variant="secondary">
            Seleccionar Fotos
          </Button>
          
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-primary mb-2">
                {files.length} archivos seleccionados
              </p>
              <Button onClick={handleUpload} className="w-full">
                Subir Todas las Fotos
              </Button>
            </div>
          )}
        </div>
      )}

      {isUploading && (
        <div className="mt-4 flex flex-col items-center space-y-2">
          <Loader2 className="animate-spin text-primary" size={24} />
          <p className="text-sm text-text-main">Subiendo imágenes...</p>
        </div>
      )}

      {uploadResults && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-center space-x-2">
          <CheckCircle2 className="text-green-500" size={18} />
          <p className="text-sm text-green-700">
            ¡Éxito! {uploadResults.success} de {uploadResults.total} fotos subidas.
          </p>
        </div>
      )}
    </div>
  );
};

export default BulkImageUpload;
