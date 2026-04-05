import { io } from 'socket.io-client';
import { API_URL } from '../config/constants';

// Single socket instance
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],   // 🔥 CRITICAL for mobile
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};