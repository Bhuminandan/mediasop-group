import { configureStore } from '@reduxjs/toolkit'
import mediasoupSlice from '../feature/mediasoupSlice';

const store = configureStore({
    reducer: {
        mediasoup: mediasoupSlice
    }
})


export default store;