import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import socketConnection from '../utilities/socketConnection'
import {  updateReduxStatus } from '../redux/feature/mediasoupSlice'
import socketIoListeners from '../webRtcUtilities/socketIoListeners'
import { Device } from 'mediasoup-client';  
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
  const [transport, setTransport] = useState(null);
  const [consumerTransport, setConsumerTransport] = useState(null);
  const [webcamClicked, setWebcamClicked] = useState(false);
  const [shareScrrenClicked, setShareScrrenClicked] = useState(false);
  const [producer, setProducer] = useState(null);
  const [webCamButtonDisabled, setWebCamButtonDisabled] = useState(false);
  const [isShareScreenDesabled, setIsShareScreenDesabled] = useState(false);
  const [isConsumeClicked, setIsConsumeClicked] = useState(false);
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
  const handleWebcamClick = () => {
    setWebcamClicked(true)
    setIsWebCam(true)
  }

  // Making the screen share button click
  // So the useEffect of getMedia could run
  const handleScrrenShareClick = () => {
    setShareScrrenClicked(true)
    setIsWebCam(false)
} 

  // Making the consume button click
  const handleSubscribeClick = () => {
    console.log('inside the >>>>>>>>>>>>> handleSubscribeClick')
    setIsConsumebuttonDisabled(true)
    setIsConsumeClicked(true)
  }  


  const handleCloseClick = () => {

    if (!transport || !consumerTransport) {
      return
    }

    console.log('inside the >>>>>>>>>>>>> handleCloseClick')
    if (transport) {
      transport.close()
    }
    if (consumerTransport) {
      consumerTransport.close()
    }
    setTransport(null)
    setWebcamClicked(false)
    setIsConsumeClicked(false)
    dispatch(updateReduxStatus({ prop: 'haveMedia', value: false }))
  }

  // ---------------------------------------------
  
  // UseEffect to make socket connection
  // This will run when the page loads
  useEffect(() => {
    const makeSocketConnection = () => {
      const socket = socketConnection();
      setSocketState(socket)
    }  

    if (!isConnected && socketState === null) {
      makeSocketConnection()
    }  
  }, [isConnected, socketState])   
  
  // Useffect to get routerRtpCapabilities
  useEffect(() => {

    // Getting the routerRtpCapabilities
    const getRouterRtpCapabilities = async () => {
      socketState.emit('getRouterRtpCapabilities', (rtpCapabilities) => {
        if (!rtpCapabilities) {
          return;
        }
      })

      // Getting the routerRtpCapabilities from server and setting it in redux
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
      })

      producer.on('trackended', () => {
        console.log('trackended')
      })
        
      } catch (error) {
        console.log('error connecting send transport', error)
      }

    }

    if (transport && paramsForTransportProducer.track) {
      connectSendTransport()
    }

  }, [deviceState, transport, paramsForTransportProducer])

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
    if (haveMedia === false && deviceState && transport && webcamClicked || shareScrrenClicked) {
      fetchMedia()
    }

    console.log('webcamClicked', webcamClicked, shareScrrenClicked, haveMedia, deviceState, transport)

  }, [webcamClicked, shareScrrenClicked])

  
  // UseEffect to createConsumertransport
  useEffect(() => {
    const createConsumertransport = async () => {

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
          onClick={handleScrrenShareClick}
          disabled={false}
          value={'screen'}
      />
      <Button
          icon={<GrResume />}
          bgColor='bg-violet-500'
          onClick={handleSubscribeClick}
          disabled={false}
          value={'subscribe'}
      />
      <Button 
          icon={<RxCross2 />}
          bgColor='bg-red-500'
          onClick={handleCloseClick}
          disabled={false}
      />
      </div>
      </div>
    </div>
  )
}

export default Home