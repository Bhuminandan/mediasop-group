import React, { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import socketConnection from '../utilities/socketConnection'
import { setSocket, updateReduxStatus } from '../redux/feature/mediasoupSlice'
import socketIoListeners from '../webRtcUtilities/socketIoListeners'
import { Device } from 'mediasoup-client';  
import LocalVideo from '../components/videoComponents/LocalVideo'
import { GrResume } from "react-icons/gr";
import { Button } from '../components/common/Button'
import { RxCross2 } from "react-icons/rx";
import { IoCamera } from "react-icons/io5";
import { FaMicrophoneAlt } from "react-icons/fa";
import { MdScreenShare } from "react-icons/md";
import ReactPlayer from 'react-player'

const Home = () => {

  const [socketState, setSocketState] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [deviceState, setDevice] = useState(null);
  const [producerState, setProducer] = useState(null);
  const [transport, setTransport] = useState(null);
  const [consumerTransport, setConsumerTransport] = useState(null);
  const [webcamClicked, setWebcamClicked] = useState(false);
  const [isConsumeClicked, setIsConsumeClicked] = useState(false);
  const [webCamButtonDisabled, setWebCamButtonDisabled] = useState(false);
  const [isConsumebuttonDisabled, setIsConsumebuttonDisabled] = useState(false);
  const [isWebCam, setIsWebCam] = useState(true);
  const [isConsumerTransportCreated, setIsConsumerTransportCreated] = useState(false);
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
  const { isConnected, haveMedia, routerRtpCapabilities, deviceLoadCalled } = useSelector(state => state.mediasoup)
                    

  // Making the webcam button click 
  // So the useEffect of getMedia could run
  const handleWebcamClick = (e) => {

    const value = e.target.value;

    console.log('inside the >>>>>>>>>>>>> handleWebcamClick', value)
    if (value === 'webcam') {
      setWebcamClicked(true)
      setWebCamButtonDisabled(true)
      setIsWebCam(true)
    } else {
      setWebCamButtonDisabled(true)
      setWebcamClicked(true)
      setIsWebCam(false)
    }
  }

  const handleSubscribeClick = () => {
    console.log('inside the >>>>>>>>>>>>> handleSubscribeClick')
    setIsConsumebuttonDisabled(true)
    setIsConsumeClicked(true)
  }

  // UseEffect to createConsumertransport
  useEffect(() => {
    const createConsumertransport = async () => {

      console.log('Inside createConsumertransport&&&&&&&>>>>>>>>>>>>>>')

      if (!deviceState) {
        console.error('Device not found inside createConsumertransport!!!!')
      }

      const obj = {
        forceTcp: false
      }

      socketState.emit('createConsumerTransport', obj )

      socketState.on('consumerTransportCreated', async (params) => {
         if (!params) {
           console.log('error creating consumer transport', params)
         }

         const transport = await deviceState.createRecvTransport(params)
         setConsumerTransport(transport);

         setIsConsumerTransportCreated(true);

         transport.on('connect', ({ dtlsParameters }, callback, errback) => {

           socketState.emit('connectConsumerTransport', {
             transportId: transport.id,
             dtlsParameters,
           })

           socketState.on('consumerTransportConnected', () => {
              callback();
           })

         })

         transport.on('connectionstatechange', (state) => {
           switch (state) {
             case 'connecting':
               console.log('+++++++++++++++++connecting')
               break;
               case 'connected':
                socketState.emit('resume')
                console.log('+++++++++++++++++connected')
               break;
             case 'failed':
              transport.close();
              console.log('+++++++++++++++++failed')
               break;
             default:
               break;
           }
         })

      })

      socketState.on('consumerResumed', () => {
        console.log('+++++++++++++++++consumerResumed')
      })

    }


    if (deviceState && isConsumeClicked && socketState) {
       createConsumertransport();
    }
    
  }, [deviceState, isConsumeClicked])


  // UseEffect to create consumer and get the remote stream
  useEffect(() => {
    const consume = () => {
      
      if (!deviceState) {
        console.error('Device not found inside consume!!!!')
      }

      const { rtpCapabilities } = deviceState

      socketState.emit('consume', {
        rtpCapabilities,
      })
      
      socketState.on('consumerCreated', async ( createdConsumer ) => {
        if (!createdConsumer) {
          console.log('no consumerxxxxxxxxxx')
        }

        const { producerId, id, kind, rtpParameters, type, producerPaused } = createdConsumer

        let codecOptions = {}

        const consumer = await consumerTransport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          codecOptions,
        })

        console.log('Finally >>>>>>>>>>>>>@@@@@@@@@@@@@@', consumer)

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        console.log('consumer track remote stream^^^^^^^^^^^^^^^^', remoteStream)

        setRemoteStream(remoteStream);
      })
    }

    if (isConsumerTransportCreated) {
      consume();
    }

    console.log('isConsumerTransportConnected================>>>>>>>>>>>>>>>>', isConsumerTransportCreated)
  }, [isConsumerTransportCreated])

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
    if (deviceState !== null && transport !== null && webcamClicked !== false) {
      fetchMedia()
    }

  }, [deviceState, haveMedia, transport, webcamClicked])


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


  // Use Effect to connect send transport
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
      <div className='w-full flex items-center justify-center gap-2'>
        <ReactPlayer playing url={localStream} /> 
        <ReactPlayer playing url={remoteStream} /> 
      </div>
      <div className='mt-10'>
      <div className='w-full flex items-center justify-center gap-4'>
      <Button
          icon={<IoCamera />}
          bgColor='bg-violet-500'
          onClick={handleWebcamClick}
          disabled={webCamButtonDisabled}
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
          onClick={handleWebcamClick}
          disabled={webCamButtonDisabled}
          value={'screen'}
      />
      <Button
          icon={<GrResume />}
          bgColor='bg-violet-500'
          onClick={handleSubscribeClick}
          disabled={isConsumebuttonDisabled}
          value={'subscribe'}
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