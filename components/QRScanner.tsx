
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import Button from './Button';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
}

/**
 * Componente QRScanner.
 * Utiliza la cámara del dispositivo para escanear códigos QR o códigos de barras.
 * Proporciona una interfaz sencilla para capturar datos de etiquetas físicas.
 */
const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose, title = "Escanear Código" }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Inicializar el escáner cuando el componente se monta
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                rememberLastUsedCamera: true
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // Éxito al escanear
                onScan(decodedText);
                scanner.clear().catch(err => console.error("Error al limpiar el escáner:", err));
                onClose();
            },
            (errorMessage) => {
                // Errores de escaneo (comunes mientras busca un código)
                // No los mostramos al usuario para evitar ruido, a menos que sea crítico
            }
        );

        scannerRef.current = scanner;

        // Limpiar al desmontar
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Error al limpiar el escáner al desmontar:", err));
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-accent flex justify-between items-center bg-primary text-white">
                    <h3 className="text-lg font-bold flex items-center">
                        <Camera className="mr-2" size={20} />
                        {title}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-accent transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-4">
                    <div id="qr-reader" className="w-full rounded-lg overflow-hidden border-2 border-accent"></div>
                    
                    {error && (
                        <p className="mt-4 text-danger text-center text-sm font-medium">
                            {error}
                        </p>
                    )}
                    
                    <div className="mt-6 flex justify-center">
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                    </div>
                </div>
                
                <div className="p-3 bg-accent bg-opacity-20 text-center">
                    <p className="text-xs text-text-light italic">
                        Coloque el código QR o de barras frente a la cámara para escanearlo automáticamente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
