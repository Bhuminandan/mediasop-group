const config = require('../config');

const createWebRtcTransport = async (router) => {

    const {
        maxIncomingBitrate,
        initialAvailableOutgoingBitrate,   
        listenIps     
    } = config.mediasoup.webRtcTransport;

    const transport = await router.createWebRtcTransport({
        listenIps:  listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate,
    })

    if (maxIncomingBitrate) {
        try {
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (error) {
            console.log('error setting maxIncomingBitrate', error);
        }
    }


    return {
        transport,
        params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }
    };
};

module.exports = {createWebRtcTransport}