import { io } from 'socket.io-client';

let socket;
const socketConnection = () => {

    if (socket && socket.connected) {
        console.log('socket connected');
        return socket;
    } else {
        socket = io.connect('https://localhost:9000');

        return socket;
    }
}

export default socketConnection;