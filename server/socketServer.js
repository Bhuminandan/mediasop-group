const { createWebRtcTransport } = require('./lib/createWebRtcTransport');
const { createWorker } = require('./lib/worker');

const io = require('./server').io;

let mediasoupRouter;
let producerTransport;
let producer;

const createMediasoupRouter = async () => {
    try {

        mediasoupRouter = await createWorker();

    } catch (error) {
        console.log('error creating worker', error);
        throw error
    }
}

mediasoupRouter = createMediasoupRouter();

io.on('connection', async (socket) => {

    console.log('user connected', socket.id);

    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });


    socket.on('getRouterRtpCapabilities', async () => {
        const routerRtpCapabilities = mediasoupRouter.rtpCapabilities;
        socket.emit('routerRtpCapabilities', routerRtpCapabilities)
    })


    socket.on('createProducerTransport', async (src) => {

        
        const { forceTcp, rtpCapabilities } = src;
        
        try {

            const { transport, params } = await createWebRtcTransport(mediasoupRouter);

            producerTransport = transport

            if (!transport) {
                params = {
                    error: 'could not create transport'
                }
            }

            socket.emit('producerTransportCreated', params)
            
        } catch (error) {
            console.log('error creating producer transport', error)
            socket.emit('producerTransportError', error)
        }

    })

    socket.on('connectProducerTransport', async ({ dtlsParameters }) => {
        try {
            await producerTransport.connect({ dtlsParameters })
            socket.emit('producerTransportConnected')
        } catch (error) {
            console.log('error connecting producer transport', error)
            socket.emit('producerTransportError', error)
        }
    })

    socket.on('produce', async ({ kind, rtpParameters }) => {

        try {
            producer = await producerTransport.produce({ kind, rtpParameters })
            const { id } = producer;
            socket.emit('producerCreated', id)
            broadcast({eventName:'newProducer',data:'new user!'})
        } catch (error) {
            console.log('error producing', error)
        }
    })

    const broadcast = ({eventName,data}) => {

        console.log('broadcasting>>>>>>>>>>>>>>>>>>>>>>>>>>>>', eventName, data)

        io.emit(`${eventName}`, data)
    }

})