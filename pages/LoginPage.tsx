import React, { useState } from 'react';
import { User } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { LogIn } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const { users } = useInventory();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUsername = username.trim().toLowerCase();
        
        // Busca el usuario en la lista de usuarios del contexto.
        let foundUser = users.find(u => u.username.toLowerCase() === trimmedUsername);

        // Fallback de seguridad: Si la base de datos está vacía o no carga, 
        // permitimos entrar con 'admin' para no bloquear al usuario.
        if (!foundUser && trimmedUsername === 'admin') {
            foundUser = { id: 'user_1', username: 'admin', role: 'admin' };
        }

        if (foundUser) {
            onLogin(foundUser);
        } else {
            setError('Usuario no encontrado. Por favor, intenta con "admin" o contacta al administrador.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Card className="w-full max-w-sm">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-accent">Boa Ideia</h1>
                    <p className="text-text-light">Gestión de Inventario</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main" htmlFor="username">
                            Usuario
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-accent rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary"
                            placeholder="ej: admin"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main" htmlFor="password">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-accent rounded-md shadow-sm focus:outline-none focus:ring-secondary focus:border-secondary"
                        />
                         <p className="text-xs text-text-light mt-1">
                            (Para este demo, la contraseña no es validada)
                        </p>
                    </div>
                    {error && <p className="text-sm text-danger text-center">{error}</p>}
                    <Button type="submit" className="w-full flex items-center justify-center">
                        <LogIn className="w-5 h-5 mr-2" />
                        Iniciar Sesión
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default LoginPage;