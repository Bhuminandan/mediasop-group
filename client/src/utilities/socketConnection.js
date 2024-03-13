import { io } from 'socket.io-client';

let socket;
const socketConnection = (roomId) => {

    if (socket && socket.connected) {
        console.log('socket connected');
        return socket;
    } else {
        socket = io.connect('https://localhost:9000', {
            auth: {
                roomId
            }
        });

        return socket;
    }
}

export default socketConnection;