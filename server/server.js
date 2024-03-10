const fs = require('fs')
const https = require('https')
const express = require('express')
const socketIo = require('socket.io')
const cors = require('cors')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(cors(
    {
        origin: '*'
    }
))

const certsKeys = {
    key: fs.readFileSync('./certs/cert.key'),
    cert: fs.readFileSync('./certs/cert.crt')
}

const expressServer = https.createServer(certsKeys, app)
const io = socketIo(expressServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
})


expressServer.listen(9000, () => {
    console.log('Listening on port 9000')
})


module.exports= {
    io,
    expressServer,
    app
}



