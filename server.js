"use strict";

const Hapi = require("@hapi/hapi");
const routes = require( "./app/routes" );
const plugins = require( "./app/plugins" );
const dotenv = require( "dotenv" );

const createServer = async () => {
    const server = new Hapi.Server({ 
        port: process.env.PORT || 8080,
        host: process.env.HOST || "localhost"
    });

    await plugins.register( server );
    server.route( routes );

    return server
};

const init = async () => {
    dotenv.config();
    const server = await createServer();
    await server.start();
    console.log( "Server running on %s", server.info.uri );
};

process.on("unhandledRejection", err => {
    console.log(err);
    process.exit(1);
});

init();