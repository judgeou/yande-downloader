import { parentPort } from 'worker_threads'

let isRun = true

parentPort.on('message', (msg) => {
    if (msg === 'terminate') {
        isRun = false
        return; 
    }
})

while (2) {

}