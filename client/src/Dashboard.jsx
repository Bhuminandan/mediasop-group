import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { v4 as uuid } from 'uuid';
import { updateReduxStatus } from "./redux/feature/mediasoupSlice";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {

    const [ roomId, setRoomId ] = useState(null)

    const navigate = useNavigate()
    const dispatch = useDispatch()

    useEffect(() => {
        const generateRoomId = () => {
            const roomId = uuid();
            setRoomId(roomId)
            dispatch(updateReduxStatus({ prop: 'roomId', value: roomId }))
        }

        generateRoomId();
    }, [])

    const handleJoin = () => {
        navigate(`/join-video/${roomId}`)
    }

  return (
    <div className="w-full h-screen flex items-center justify-center">
        <button 
            onClick={handleJoin}
            type="button" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
            Join
        </button>
    </div>
  )
}

export default Dashboard