import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'

const agent = new SocksProxyAgent('socks://127.0.0.1:4321')

function extract_url (url) {
  const parsed = new URL(url)
  return {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search
  }
}

async function request_text (url, { headers = {} } =  {}) {
  return new Promise((resolve, reject) => {
    const hp = extract_url(url)

    const req = https.request({
      hostname: hp.hostname,
      path: hp.path,
      method: 'GET',
      agent,
      headers,
      minVersion: 'TLSv1.2'
    }, res => {
      let recv_buffer = Buffer.alloc(0)

      res.on('data', data => {
        recv_buffer = Buffer.concat([recv_buffer, data])
      })

      res.on('end', () => {
        resolve(recv_buffer.toString('utf-8'))
      })
    })
    
    req.on('error', err => {
      reject(err)
    })
    
    req.end()
  })
}

const download_url = `https://s1.cdndrive.uk/api/v3/slave/download/0/dXBsb2Fkcy8yMDIzLzA4LzE3L3Q0Y1NxekZNX2tjLjd6/kc.7z?sign=mvsRZJaKo3fjaI-SzFK4s_g2aHNNwGooT7iSjUjg4zY%3D%3A1692331568`

request_text('https://tls.browserleaks.com/tls').then(json => {
  const obj = JSON.parse(json)
  console.log(obj)
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