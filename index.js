require('dotenv').config();
const express = require('express')
var cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;



// middleware
app.use(
  cors({
      origin: [
        // 'http://localhost:5173',
        // 'http://localhost:5174',
        'https://services-by-doctors.web.app',
      'https://services-by-doctors.firebaseapp.com'
      ],
      credentials: true,
  }),
)
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.BD_USER}:${process.env.BD_PASS}@cluster0.kckbgvo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// middleware
const logger = async(req, res, next) => {
  console.log('colled:', req.host, req.originalUrl);
  console.log('log: info', req.method, req.url);
  next();
}


const verifyToken = async (req, res, next) =>{
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token)
  // no token available
  if (!token) {
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if (err) {
      // console.log(err);
      return res.status(401).send({message: 'unauthorized access'})
    }
    // if token is valid then it would be decoded
    // console.log('value in the token', decoded)
    req.user = decoded;
    next();
  })
  
}



const cookeOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'? true : false,
  sameSite:  process.env.NODE_ENV === 'production'? 'none' : 'strict'
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const popularCollection = client.db("servicesDoctorsDB").collection('popularServices');
    const allCollection = client.db("servicesDoctorsDB").collection('allServices');
    const manageCollection = client.db("servicesDoctorsDB").collection('manageServices');



    // auth related api
    app.post('/jwt', logger, async(req, res) =>{
      const user =req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });

      res.cookie('token', token, cookeOption)
      .send({success: true});
    })

    app.post('/logout', async(req, res) =>{
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { ...cookeOption, maxAge: 0 }).send({ success: true })
    })




    // Popular Services
    app.get('/popularServices', async(req, res) =>{
      const cursor = popularCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get('/popularServices/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId (id) }
      const options = {
      // Include only the `title` and `imdb` fields in each returned document
        projection: { service_name: 1, service_price: 1, service_id: 1, img: 1 },
      };
      const result = await allCollection.findOne(query, options);
      res.send(result);
    })


    // All Services
    app.get('/allServices', async(req, res) =>{
      const cursor = allCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.get('/allServices/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId (id) }
      const options = {
      // Include only the `title` and `imdb` fields in each returned document
        projection: { service_name: 1, service_price: 1, providerName: 1, imgURL: 1 },
      };
      const result = await allCollection.findOne(query, options);
      res.send(result);
    })


// Manage Services
app.get('/manageServices', logger, verifyToken, async(req, res) =>{
  console.log(req.query.email);
  console.log('token owner info', req.user)
  if (req.user.email !== req.query.email) {
    return res.status(403).send({message: 'forbidden access'})
  }
  let query = {};
  if (req.query?.email) {
    query = { email: req.query.email }
  }
  const result = await manageCollection.find(query).toArray();
  res.send(result);
})


app.post('/manageServices', async(req, res) => {
  const newServices = req.body;
  console.log(newServices);
  const result = await manageCollection.insertOne(newServices);
  res.send(result)
})


app.patch('/manageServices/:id', async(req, res) =>{
  const id = req.params.id;
  const filter = { _id: new ObjectId (id) };
  const updatedManage = req.body;
  console.log(updatedManage);
  const updateDoc = {
    $set: {
      status: updatedManage.status
    },
  };
  const result = await manageCollection.updateOne(filter,updateDoc);
  res.send(result)
})


app.delete('/manageServices/:id', async(req, res) =>{
  const id = req.params.id;
  const query = { _id: new ObjectId (id) }
  const result = await manageCollection.deleteOne(query);
  res.send(result);
})




      // Send a ping to confirm a successful connection
      // await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
      // await client.close();
    }
  }
  run().catch(console.dir);
  
  
  app.get('/', (req, res) => {
    res.send('consultation Services By Doctors server is runing!')
  })
  
  app.listen(port, () => {
    console.log(`consultation Services By Doctors server is runing on port ${port}`)
  })