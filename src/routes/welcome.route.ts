import {FastifyInstance} from "fastify";
import {IService} from "../interfaces";

// A simple route that sends back an HTML message
export async function welcomeroutes(app: FastifyInstance){
    app.get('/welcome', async (request, reply) => {
  // We tell the browser to treat this as an HTML page
    reply.type('text/html');

    return `
        <html>
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #2e7d32;"><b>Welcome to Travelbase!</b></h1>
            <p>Your backend server is running perfectly with <b>Fastify</b> and <b>TypeScript</b>.</p>
            <a href="/health" style="color: blue;">Check Server Health</a>
        </body>
        </html>
    `;
    });
}