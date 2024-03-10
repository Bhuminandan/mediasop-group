import React from 'react'
import ReactPlayer from 'react-player'

const LocalVideo = ({ localStream }) => {

  return (
    <div className='w-1/2 h-1/w-1/2 flex items-center justify-center mt-10'>
      <ReactPlayer 
      url={localStream}
      playing
      controls
      />
    </div>
  )
}

export default LocalVideo