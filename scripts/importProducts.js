const mongoose = require("mongoose");
const Product = require("../models/Product");
const products = require("../data/products.json");


mongoose.connect("mongodb://127.0.0.1:27017/avsweethouse")
.then(async()=>{

    console.log("MongoDB Connected");


    await Product.deleteMany();


    await Product.insertMany(products);


    console.log("270 Products Imported Successfully");


    mongoose.connection.close();

})
.catch(err=>{

    console.log(err);

});