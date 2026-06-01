import {config} from "dotenv";

config();
import {buildServer} from "./server";
import {config as environmentVariables} from './config';
import {connectRedis} from "./lib";
import {Logger} from "./helpers/Logger";

const app = buildServer();
const port = Number(environmentVariables.port ?? 3000);

connectRedis().then(r => Logger.Info(r)).catch(err => Logger.Error("Failed to connect to Redis", err));
app.listen({port, host: "0.0.0.0"}).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
