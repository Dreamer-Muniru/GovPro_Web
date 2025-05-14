const mongoose = require('mongoose')


// var mongoURL = 'mongodb+srv://Dreamer:Dreamer2223@cluster0.mg1um.mongodb.net/mern-pizza'
var mongoURL = 'mongodb+srv://maher:4422@cluster0.mg1um.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

// var mongoURL = 'mongodb+srv://Dreamer:Dreamer2223@cluster0.mg1um.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

mongoose.connect(mongoURL, {useUnifiedTopology: true, useNewUrlParser: true})

let db = mongoose.connection
//check connection{
    db.on('open', function(){
        console.log('Connected to MongoDB')
    });
//check for db errors
db.on('error', function(err){
    console.log(err)
})


module.exports = mongoose