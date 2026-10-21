import { io } from 'socket.io-client'
export const socket = io('/', { autoConnect: false, path: '/socket.io', transports: ['websocket'], reconnection: true, reconnectionAttempts: 8, timeout: 5000 })
