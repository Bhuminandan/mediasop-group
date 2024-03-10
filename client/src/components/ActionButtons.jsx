

import React from 'react'

const ActionButtons = () => {

    

  return (
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
  )
}

export default ActionButtons