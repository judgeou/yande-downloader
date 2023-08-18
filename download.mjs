import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'

const agent = new SocksProxyAgent('socks://127.0.0.1:4321')

`
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