import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import http from 'http'

const streamPipeline = promisify(pipeline)

async function postJSONHttp (url, postData) {
  const postStr = JSON.stringify(postData)
  const request = http.request
  const urlobj = new URL(url)
  
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: urlobj.hostname,
      port: urlobj.port,
      path: urlobj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    }, res => {
      if (res.statusCode != 200) {
        reject(404)
        return
      }

      let data = ''

      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        let json = JSON.parse(data)
        resolve(json)
      })
    })

    req.write(postStr)
    req.end()
  })
}

function downloadFileHttp (url, filepath) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      streamPipeline(res, fs.createWriteStream(filepath)).then(resolve)
    })

    req.setTimeout(3000)
    req.on('timeout', () => {
      console.log(`timeout: ${url}`)
      downloadFileHttp(url, filepath).then(resolve)
    })
  })
}

const limit = 20
const max = 100
const HOST = '127.0.0.1:5000'

async function main () {
  for (let i = 0; i < max; i += limit) {
    const post_url = `http://${HOST}/api/random/3`
    const post_params = {
      "rating": "s",
      "and_array": ["anmi","solo"],
      "or_array": [],
      limit
    }
    const post_rows = await postJSONHttp(post_url, post_params)

    for (let post of post_rows) {
      const image_url = `http://${HOST}/api/image/${post.id}`
      await downloadFileHttp(image_url, path.resolve(`output2`, `${post.id}.jpg`))
      console.log(post.id)
    }
  }
}

main()
