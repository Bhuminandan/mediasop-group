import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    socket: null,
    isConnected: false,
    video: null,
    audio: null,
    isWebCam: true,
    haveMedia: false,
    deviceLoadCalled: false,
    routerRtpCapabilities: null,
}


const mediasoupSlice = createSlice({
    name: 'mediasoup',
    initialState,
    reducers: {
        updateReduxStatus: (state, action) => {
            state[action.payload.prop] = action.payload.value
        },
        setSocket: (state, action) => {
            state.socket = action.payload
            state.isConnected = true
        }
    }
})


export const { setRoom, setSocket, updateReduxStatus } = mediasoupSlice.actions
export default mediasoupSlice.reducer