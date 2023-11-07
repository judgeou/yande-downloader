import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'

const streamPipeline = promisify(pipeline)
const agent = new SocksProxyAgent('socks://127.0.0.1:4321')
const base_headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  "cookie": "cloudreve-session=MTY5MjM2OTM2N3xOd3dBTkZCRVJqUlNXRE0wVjBKVVdWRkJVbGRLVjAxRFFVTkRRekpHUmxOUlRsQk9TRXRUTkZGUk0xSlBORU5CUTBGV1RGUTBOVkU9fNg8cFBS6uczcArlsAG-Ydv7wyZgBWftRcIBkqfecAUE"
}
const PART_SIZE = 2 * 1024 * 1024
const plimit = promiseLimit(16)
const download_dir = './sakuradrive'

function extract_url (url) {
  const parsed = new URL(url)
  return {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search
  }
}

function extract_filename (content_disposition) {
  const input = content_disposition;
  const regex = /filename="([^"]+)"/;
  const match = input.match(regex);

  if (match && match[1]) {
    const filename = match[1];
    return filename
  } else {
    return null
  }
}

async function request_response (url, options, headers = {}) {
  return new Promise((resolve, reject) => {
    const hp = extract_url(url)

    const req = https.request({
      hostname: hp.hostname,
      path: hp.path,
      method: 'GET',
      agent,
      headers: {...base_headers, ...headers},
      minVersion: 'TLSv1.2',
      ...options
    }, resolve)
    
    req.on('error', reject)

    req.end()
  })
}

async function request_text (url, options = {}) {
  return new Promise(async (resolve, reject) => {
    const response = await request_response(url, options)
    let recv_buffer = Buffer.alloc(0)

    response.on('data', data => {
      recv_buffer = Buffer.concat([recv_buffer, data])
    })

    response.on('end', () => {
      resolve(recv_buffer.toString('utf-8'))
    })
  })
}

async function request_content_length (url) {
  const res = await request_response(url, {
    method: 'GET'
  })

  const content_length = res.headers['content-length']
  const content_disposition = res.headers['content-disposition']
  const filename = extract_filename(content_disposition)

  res.destroy()

  return { content_length, filename }
}

async function merge_filepart (filename, fileparts = []) {

}

async function download_part (url, filename, start, end, serial_number) {
  console.log({url, filename, start, end, serial_number})
  const output_path = path.join(download_dir, `${filename}-part${serial_number}`)
  const writer = fs.createWriteStream(output_path)

  const res = await request_response(url, {}, {
    'Range': `bytes=${start}-${end}`,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Referer": "https://sakuradrive.com/s/b4Nh4",
  })

  return streamPipeline(res, writer)
}

request_text(`https://sakuradrive.com/api/v3/share/download/b4Nh4?path=undefined%2Fundefined`, {
  method: 'PUT'
}).then(async json => {
  const obj = JSON.parse(json)
  const file_url = obj.data
  
  const { content_length, filename } = await request_content_length(file_url)
  const total_size = Number(content_length)
  let serial_number = 1
  const tasks = []

  for (let current_size = 0; current_size < total_size; ) {
    const sn = serial_number
    const start = current_size
    const end = Math.min(start + PART_SIZE, total_size)
    const task = plimit(async () => download_part(file_url, filename, start, end, sn))
    tasks.push(task)
    serial_number++
    current_size = end
  }

  await Promise.all(tasks)

})

const aaa = `
fetch("https://s1.cdndrive.uk/api/v3/slave/download/0/dXBsb2Fkcy8yMDIzLzA4LzE3L3Q0Y1NxekZNX2tjLjd6/kc.7z?sign=ddIOXhwG96MCEw2ev2mkZhU3-5bSRmPo0q1PSTCLo3E%3D%3A1692286454", {
  "headers": {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "cross-site",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1"
  },
  "referrer": "https://sakuradrive.com/",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "omit"
});
`

const a1 = `
fetch("https://sakuradrive.com/api/v3/share/download/w6kYCj?path=undefined%2Fundefined", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "cookie": "_pk_id.4.a81d=7633b2ff7b681eee.1685342159.; _pk_ses.4.a81d=1; cloudreve-session=MTY5MjMzMTE1OXxOd3dBTkVRMVYwUkJVRk5HVEVOVlJWRXpSVWhDV2xaSFVqUTNWVnBXV0VoSlUweEhXVkEyTjB4V1JUSklTVTlQV1V0WldFTlVNa0U9fFORk4mVa36nMH-CpZBLk3VChwEkZpLzBasCNz2NrJ1A",
    "Referer": "https://sakuradrive.com/s/w6kYCj",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "body": null,
  "method": "PUT"
});`

const a2 = `

fetch("https://tls.browserleaks.com/tls", {
  "headers": {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site"
  },
  "referrerPolicy": "same-origin",
  "body": null,
  "method": "GET"
});`