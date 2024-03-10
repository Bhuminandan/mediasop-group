const app = require('./server').app;



app.get('/test', (req, res) => {
    res.send('Hello World')
})