const mediasoup = require('mediasoup');
const config = require('../config');



const createWorker = async () => {

    let worker;
    try {
        worker = await mediasoup.createWorker({
            logLevel: config.mediasoup.worker.logLevel,
            logTags: config.mediasoup.worker.logTags,
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort
        })

    } catch (error) {
     console.log("Error while creating worker", error)   
    }

    worker.on('died', () => {
        console.error('mediasoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
    })
    

    const mediaCodecs = config.mediasoup.router.mediaCodecs;
    
    const mediasoupRouter = await worker.createRouter({ mediaCodecs });

    return mediasoupRouter;
}


module.exports = {
    createWorker
}