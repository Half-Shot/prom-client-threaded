import { Worker } from 'worker_threads';
import { Registry, collectDefaultMetrics } from "prom-client";
import * as Path from "path";

const WORKER_PATH = Path.join(__dirname, "./worker.js");

export class ThreadedRegistry {
    	/**
	 * Get string representation for all metrics
	 */
	metrics(): string;

	/**
	 * Remove all metrics from the registry
	 */
	clear(): void;

	/**
	 * Reset all metrics in the registry
	 */
	resetMetrics(): void;

	/**
	 * Register metric to register
	 * @param metric Metric to add to register
	 */
	registerMetric<T extends string>(metric: Metric<T>): void;

	/**
	 * Get all metrics as objects
	 */
	getMetricsAsJSON(): metric[];

	/**
	 * Get all metrics as objects
	 */
	getMetricsAsArray(): metric[];

	/**
	 * Remove a single metric
	 * @param name The name of the metric to remove
	 */
	removeSingleMetric(name: string): void;

	/**
	 * Get a single metric
	 * @param name The name of the metric
	 */
	getSingleMetric<T extends string>(name: string): Metric<T>;

	/**
	 * Set static labels to every metric emitted by this registry
	 * @param labels of name/value pairs:
	 * { defaultLabel: "value", anotherLabel: "value 2" }
	 */
	setDefaultLabels(labels: Object): void;

	/**
	 * Get a string representation of a single metric by name
	 * @param name The name of the metric
	 */
	getSingleMetricAsString(name: string): string;

	/**
	 * Gets the Content-Type of the metrics for use in the response headers.
	 */
	get contentType(): string {
        return "text/plain";
    }
}

export class PrometheusClient {
    private worker!: Worker;
    private mainRegistry: Registry;
    private threadedRegistry: ThreadedRegistry;
    constructor() {
        this.mainRegistry = new Registry();
        this.threadedRegistry = new ThreadedRegistry();
    }

    public spawnWorker(interval: number = 5000) {
        this.worker = new Worker(WORKER_PATH, { stdout: false, stderr: false});
        collectDefaultMetrics({ register: this.threadedRegistry });
        // Send metrics at intervals
        setInterval(() => this.sendDefaultMetrics(), interval);
        this.sendDefaultMetrics();
        process.on("beforeExit", () => {
            this.worker.terminate();
        });
    }

    public incCounter(name: string) {
        this.worker.postMessage(`${name}:inc`);
    }

    private sendDefaultMetrics() {
        console.log('Dumping register');
        this.worker.postMessage('register_dump:' + this.mainRegistry.metrics());
    }
}

function main() {
    const promClient = new PrometheusClient();
    promClient.spawnWorker();
    console.log("Doing work");
    for (let index = 0; index < 10000000000; index++) {
        if (index % 10000 === 0) {
            promClient.incCounter('counter');
        }
        index++;
    }
    console.log("Done work");
}


main();
