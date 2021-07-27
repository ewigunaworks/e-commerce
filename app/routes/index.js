"use strict";

const product = require( "./api/product" );
const transaction = require( "./api/transaction" );

const home = {
  method: "GET",
  path: "/",
  handler: ( request, h ) => {
    return "hello world!";
  }
};

module.exports = [ home ].concat(product, transaction);