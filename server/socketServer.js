const { createWebRtcTransport } = require('./lib/createWebRtcTransport');
const { createWorker } = require('./lib/worker');

const io = require('./server').io;

let mediasoupRouter;
let producerTransport;
let consumerTransport;
let producer;
let consumer;

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
    const room = socket.handshake.auth.roomId
    socket.join(room);

    
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

    socket.on('createConsumerTransport', async (obj) => {
        try {

            const { transport, params } = await createWebRtcTransport(mediasoupRouter);

            if (!transport) {
                params = {
                    error: 'could not create transport'
                }
            }

            console.log('consumer transport created>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>&&&&&&&77', params)

            consumerTransport = transport;

            socket.emit('consumerTransportCreated', params)
            
        } catch (error) {
            console.log('error creating consumer transport', error)
        }
    })

    socket.on('connectConsumerTransport', async ({ dtlsParameters }) => {

        try {
            await consumerTransport.connect({ dtlsParameters })
            socket.emit('consumerTransportConnected')
        } catch (error) {
            console.log('error connecting consumer transport', error)            
        }
    })

    socket.on('resume', async () => {
       try {
        await consumer.resume();
        socket.emit('consumerResumed')
       } catch (error) {
        console.log('error resuming consumer', error)
       }
    })

    socket.on('produce', async ({ kind, rtpParameters }) => {

        try {
            producer = await producerTransport.produce({ kind, rtpParameters })
            const { id } = producer;
            socket.emit('producerCreated', id)  
            io.sockets.in(room).emit('newProducer', {id});
        } catch (error) {
            console.log('error producing', error)
        }
    })

    socket.on('consume', async ({ rtpCapabilities }) => {
        const createdConsumer = await createConsumer({ rtpCapabilities });

        if (!createdConsumer) {
            console.log('cannot consume no consumer returned from createConsumer') 
        }

        socket.emit('consumerCreated', createdConsumer)
    })

    const createConsumer = async ({ rtpCapabilities }) => {

        if (!producer) {
            console.log('no producer')
            return
        }

        if (mediasoupRouter.canConsume({ producerId: producer.id, rtpCapabilities })) {
            try {
                consumer = await consumerTransport.consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true
                })
                return {
                    producerId : producer.id,
                    id : consumer.id,
                    kind : consumer.kind,
                    rtpParameters : consumer.rtpParameters,
                    type : consumer.type,
                    producerPaused : consumer.producerPaused
                }
            } catch (error) {
                console.log('error consuming', error)
            }
            
        } else {
            console.log('cannot consume')
        }
        
    }

})