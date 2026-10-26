import { io } from 'socket.io-client';

export const socket = io(import.meta.env.DEV ? '/' : import.meta.env.VITE_API_URL || '/', { withCredentials: true, autoConnect: false, transports: ['websocket', 'polling'] });
