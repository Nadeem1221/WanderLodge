const mongoose = require("mongoose");//inintialize the database
const initData = require("./data.js");
const Listing =require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust"; //where wanderlust is my datasbase name

main().then(()=>{
   console.log("Connected to Database");
}).catch((err)=>{
   console.log(err);
});

async function main(){
    await mongoose.connect(MONGO_URL);
};

const initDB = async ()=>{  //if initially data present hoga to delete ho jaega

  await Listing.deleteMany({});
  await Listing.insertMany(initData.data); //initData is a object while data is key of object having value sampleListing
  console.log("Database was initialized");
};

initDB();

