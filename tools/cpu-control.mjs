import http from 'http'
import os from 'os'
import { Worker } from 'worker_threads'

//const w = new Worker('./tools/busy-worker.mjs')

class BusyBoy {
    targetPresent = 0.6
    targetScript = './tools/busy-worker.mjs'
    busyWaitMs = 3000
    
    cores = 1

    workers = []
    touchTime = new Date()

    constructor (busyWaitMs = 3000, targetPresent = 0.6) {
        this.busyWaitMs = busyWaitMs
        this.targetPresent = targetPresent
        this.cores = os.cpus().length
    }

    busy () {
        const targetCores = Math.round(this.cores * this.targetPresent)
        this.workers = []

        for (let i = 0; i < targetCores; i++) {
            this.workers.push(new Worker(this.targetScript))
        }
    }

    idle () {
        for (let w of this.workers) {
            w.terminate()
        }

        this.workers = []
    }

    touch () {
        this.idle()
        this.touchTime = new Date()

        setTimeout(() => {
            const now = new Date()
            if ((now.getTime() - this.touchTime) >= this.busyWaitMs) {
                this.busy()
            }
        }, this.busyWaitMs)
    }
}

const boy = new BusyBoy()
boy.busy()

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World');

  boy.touch()
});

server.listen(4444, () => {
  console.log(`Server running on http://localhost:${4444}`);
});