import {config} from "dotenv";

config();
config({ path: resolve(__dirname, '../.env.example') });

console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET ? 'YES' : 'NO');
import {buildServer} from "./server";
import {config as environmentVariables} from './config';
import {connectRedis} from "./lib";
import {Logger} from "./helpers/Logger";
import { resolve } from "path/win32";

const app = buildServer();
const port = Number(environmentVariables.port ?? 3000);

connectRedis().then(r => Logger.Info(r)).catch(err => Logger.Error("Failed to connect to Redis", err));
app.listen({port, host: "0.0.0.0"}).catch((err) => {
    app.log.error(err);
    process.exit(1);
});
