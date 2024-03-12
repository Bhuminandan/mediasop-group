const os = require('os');

const config = {
    listenIp: '0.0.0.0',
    listenPort: 3016,
    mediasoup: {
        numWorkers: os.cpus().length,
        worker: {
            rtcMinPort: 3000,
            rtcMaxPort: 3300,
            logLevel: 'debug',
            logTags: [
                'info',
                'ice',
                'dtls',
                'rtp',
                'srtp',
                'rtcp',
                'rtx',
                'bwe',
                'score',
                'simulcast',
                'svc'
            ],
        },
        router: {
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000
                    }
                }
            ]
        },
        webRtcTransport: {
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: '127.0.0.1'
                }
            ],
            maxIncomingBitrate: 1500000,
            initialAvailableOutgoingBitrate: 1000000
        }
    },
}


module.exports = config