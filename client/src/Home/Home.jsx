import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import socketConnection from '../utilities/socketConnection'
import { setSocket, updateReduxStatus } from '../redux/feature/mediasoupSlice'
import socketIoListeners from '../webRtcUtilities/socketIoListeners'
import { Device } from 'mediasoup-client';  
import LocalVideo from '../components/videoComponents/LocalVideo'
import { Button } from '../components/common/Button'
import { RxCross2 } from "react-icons/rx";
import { IoCamera } from "react-icons/io5";
import { FaMicrophoneAlt } from "react-icons/fa";
import { MdScreenShare } from "react-icons/md";
import ReactPlayer from 'react-player'

const Home = () => {

  const [socketState, setSocketState] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [deviceState, setDevice] = useState(null);
  const [producerState, setProducer] = useState(null);
  const [transport, setTransport] = useState(null);
  const [paramsForTransportProducer, setParamsForTransportProducer] = useState({
    encoding: [
      {
        rid: 'r0',
        maxBitrate: 100000,
        scalabilityMode: 'S1T3'
      },
      {
        rid: 'r1',
        maxBitrate: 300000,
        scalabilityMode: 'S1T3'
      },
      {
        rid: 'r2',
        maxBitrate: 900000,
        scalabilityMode: 'S1T3'
      }
    ],
    codecOptions: {
      videoGoogleStartBitrate: 1000
    }
  });

  const dispatch = useDispatch()
  const { isConnected, haveMedia, routerRtpCapabilities, isWebCam, deviceLoadCalled } = useSelector(state => state.mediasoup)
                    

// UseEfferect to get the user
const handleWebcamClick = () => {
  
}

// UseEffect to make socket connection
useEffect(() => {
  const makeSocketConnection = () => {
    const socket = socketConnection();
    socketIoListeners(socket, dispatch)
    setSocketState(socket)
  }

  if (!isConnected && socketState === null) {
    makeSocketConnection()
  }
}, [isConnected, socketState])


  // UseEffect to fetch media
  useEffect(() => {
    const fetchMedia = async () => {

      const constraints = {
        audio: true,
        video: true
      }

      try {
        const stream = isWebCam ? 
        await navigator.mediaDevices.getUserMedia(constraints) 
        : 
        await navigator.mediaDevices.getDisplayMedia({video: true});

        const track = stream.getVideoTracks()[0];
        setParamsForTransportProducer({
          ...paramsForTransportProducer,
          track
        })

        setLocalStream(stream)

        dispatch(updateReduxStatus({ prop: 'haveMedia', value: true }))       

      } catch (error) {
        console.log("error", error)
      }
      
    }
    if (deviceState !== null && transport !== null) {
      fetchMedia()
    }

  }, [deviceState, haveMedia, transport])


  // Useffect to get routerRtpCapabilities
  useEffect(() => {

    const getRouterRtpCapabilities = async () => {

      
      
      socketState.emit('getRouterRtpCapabilities', (rtpCapabilities) => {
        if (!rtpCapabilities) {
          return;
        }

        dispatch(updateReduxStatus({ prop: 'routerRtpCapabilities', value: rtpCapabilities }))
      })

      socketState.on("routerRtpCapabilities", (rtpCapabilities) => {
        if (!rtpCapabilities) {
            return;
        }
        dispatch(updateReduxStatus({ prop: "routerRtpCapabilities", value: rtpCapabilities }));
    });
    }
    
    if (socketState !== null && routerRtpCapabilities === null) {
      getRouterRtpCapabilities(routerRtpCapabilities)     
    }

  }, [socketState, routerRtpCapabilities])


  // Useffect to create device
  useEffect(() => {

    const createDevice = async (routerRtpCapabilities) => {
      let device;
        try {
        device = new Device();
        setDevice(device)
        dispatch(updateReduxStatus({ prop: 'haveDevice', value: true }))
        } catch (error) {

          if(error.name === 'UnsupportedError') {
            console.log('browser not supported')
          }
          console.log('error creating device', error)
        }


        await device.load({ routerRtpCapabilities })
        dispatch(updateReduxStatus({ prop: 'deviceLoadCalled', value: true }))
    }

    if (routerRtpCapabilities !== null) {
      createDevice(routerRtpCapabilities)
    }

  }, [routerRtpCapabilities])


  // Use Effct to create transport 
  useEffect(() => {

    const createTranspost = async () => {

        if (!deviceState) {
          console.error('Device not found inside createTranspost!!!!')
        }

        const src = {
          forceTransportCreation: true,
          rtpCapabilities: deviceState.rtpCapabilities
        }

        socketState.emit('createProducerTransport', src)

        socketState.on('producerTransportCreated', (params) => {
          
          if (params.error) {
            console.log("error", params.error)
          }

          const { id, iceParameters, iceCandidates, dtlsParameters } = params;


          const transport = deviceState.createSendTransport({
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
          })

          setTransport(transport);

          transport.on('connect', ({ dtlsParameters }, callback, errback) => {

            console.log("Inside producerTransportCreated$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")


            socketState.emit('connectProducerTransport', {
              dtlsParameters,
            })

            socketState.on('producerTransportConnected', () => {
              console.log("Inside producerTransportConnected$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
              callback()
            })

            socketState.on('producerTransportError', (error) => {
              errback(error)
            })
          })

          transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
            socketState.emit('produce', {
              transportId: transport.id,
              kind,
              rtpParameters,
            })

            socketState.on('producerCreated', (id) => {

              if (id) {
                console.log("Inside producerCreated, id is >>>>>>>>>>>>>>>>", id)
                
              }
              callback({ id })
            })
          })

          transport.on('connectionstatechange', (state) => {
            switch (state) {
              case 'connecting':
                console.log('connecting<<<<<<<<<<<<')
                break
              case 'connected':
                console.log('connected<<<<<<<<<<<<')
                break
              case 'failed':
                console.log('failed<<<<<<<<<<<<')
                break
              case 'disconnected':
                console.log('disconnected<<<<<<<<<<<<')
                break
              default:
                break
            }
          })
        })
    }
    
    if (deviceLoadCalled) {
      createTranspost()
    }
  }, [deviceLoadCalled, deviceState])


  useEffect(() => {

    const connectSendTransport = async () => {
      if (!transport) {
        console.log('transport not found inside connectSendTransport')
        return
      }

      try {

        console.log('inside connectSendTransport==========', paramsForTransportProducer)
      const producer = await transport.produce(
        paramsForTransportProducer
      )

      producer.on('transportclose', () => {
        console.log('transportclose')
        setProducer(null)
      })

      producer.on('trackended', () => {
        console.log('trackended')
      })


      setProducer(producer);

        
      } catch (error) {
        console.log('error connecting send transport', error)
      }

    }

    if (transport !== null && paramsForTransportProducer.track) {
      connectSendTransport()
    }
    
  }, [deviceState, transport, paramsForTransportProducer])


  return (
    <div className="flex items-center justify-center flex-col w-full h-full m-auto">
      <div className='w-full flex items-center justify-center'>
        <ReactPlayer playing url={localStream} /> 
      </div>
      <div className='mt-10'>
      <div className='w-full flex items-center justify-center gap-4'>
      <Button
          icon={<IoCamera />}
          bgColor='bg-violet-500'
          onClick={handleWebcamClick}
          disabled={false}
          value={'webcam'}
      />
      <Button 
          icon={<FaMicrophoneAlt />}
          bgColor='bg-violet-500'
          onClick={() => {
              console.log('mic')
          }}
          disabled={false}
      />
      <Button
          icon={<MdScreenShare />}
          bgColor='bg-violet-500'
          onClick={() => {
              console.log('share')
          }}
          disabled={false}
      />
      <Button 
          icon={<RxCross2 />}
          bgColor='bg-red-500'
          onClick={() => {
          console.log('close')
          }}
          disabled={false}
      />
      </div>
      </div>
    </div>
  )
}

export default Home