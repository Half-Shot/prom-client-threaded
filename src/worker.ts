import { Registry, Counter } from "prom-client";
import { parentPort } from 'worker_threads';
import { default as express } from "express";

function worker() {
    const register = new Registry();
    new Counter({name: 'counter', help: 'A count', registers: [register]});
    let mainProcessDump = "";
    const app = express();
    app.get("/metrics", (_, res) => {
        console.log("Handling req");
        res.contentType(register.contentType);
        res.end(`${mainProcessDump}\n\n${register.metrics()}`);
    });
    app.listen(8000);
    console.log("Listening");

    parentPort?.on('message', (msg: string) => {
        const [metricName, operation] = msg.split(':');
        if (metricName === 'register_dump') {
            mainProcessDump = operation;
            return;
        }
        const metric = register.getSingleMetric(metricName);
        if (!metric) {
            console.warn('Metric not found');
            return;
        }
        if (operation === 'inc') {
            (metric as Counter<string>).inc();
        } else {
            console.warn('Operation not understood');
            return;
        }
    });
}

worker();