import os from "os";
import { Worker } from "worker_threads";

function runWorker(iterations: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const { parentPort, workerData } = require('worker_threads');

      function heavyCalculation(iterations) {
        let count = 0;
        for (let i = 0; i < iterations; i++) {
          count += Math.sqrt(i) * Math.random();
        }
        return count;
      }

      const result = heavyCalculation(workerData.iterations);
      parentPort.postMessage(result);
      `,
      {
        eval: true,
        workerData: { iterations },
      },
    );

    worker.on("message", resolve);
    worker.on("error", reject);
  });
}

export async function runParallelCalculation() {
  const cpuCount = os.cpus().length;
  const iterations = 900_000_000;

  const workers = Array.from({ length: cpuCount }, () => runWorker(iterations));

  const start = Date.now();
  await Promise.all(workers);
  const end = Date.now();

  return {
    cpuCount,
    timeMs: end - start,
  };
}
