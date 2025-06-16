

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const port = 3019;

const app = express();

mongoose.connect("mongodb+srv://HetviK22:HetviK76004@cluster0.wrddkah.mongodb.net/ReadCycle");

const userschema=mongoose.Schema({
  name:String,
  age:Number
})

const userModel = mongoose.model("Users", userschema)

const userModel1 = new userModel({
  name:"Hetvi",
  age:18
})

userModel1.save()

app.listen(port, () => {
  console.log('Server started on http://localhost:' + port);
});
