// Import required modules
import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import https from 'https'

const streamPipeline = promisify(pipeline)
const plimit = promiseLimit(4)
const POST_URL = `https://danbooru.donmai.us/posts.json`
// const POST_URL = `https://yande.re/post.json`
// const POST_URL = `https://konachan.com/post.json`

// proxy.default.setConfig({
//   http: process.env.http_proxy,
//   https: process.env.https_proxy
// })
// proxy.default.start()

const baseHeaders = {
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  'Accept-Encoding': 'gzip, deflate, br',
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Referer': 'https://gelbooru.com/',
  "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-site",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
}

let outputDir = 'output'
let downlaodedCount = 0
let downloadedMap = new Map()

async function fetchWithTimeout(url, options, timeout = 3000) {
  return new Promise((resolve, reject) => {
    let isDone = false

    fn1 = () => {
      if (isDone) {
        return
      }
      const controller = new AbortController();
      const response = fetch(url, { signal: controller.signal, ...options });
      response.then(res => {
        const result = bodyToBuffer(res.body)
        isDone = true
        resolve(result)
      })

      setTimeout(() => {
        controller.abort()
        fn1()
      }, timeout)
    }

    fn1()
  })
}

async function fetchWithNothing (url, options) {
  const response = await fetch(url, { signal: controller.signal, ...options });
  return bodyToBuffer(response.body)
}

function fetchReturnController (url) {
  const controller = new AbortController();
  const response = fetch(url, { signal: controller.signal, headers: baseHeaders });

  const bufferPromise = new Promise((resolve, reject) => {
    response.then(async res =>{
      const buffer = await bodyToBuffer(res.body)
      resolve(buffer)
    }).catch(() => {})
  })
  
  return {
    controller,
    bufferPromise
  }
}

async function bodyToBuffer (body) {
  return new Promise((resolve, reject) => {
    let chunks = []
    body.on('data', (chunk) => {
      chunks.push(chunk)
    })
    body.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    body.on('error', (err) => {
      reject(err)
    })
  })
}

async function fetchHead (url) {
  const options = {
    method: 'HEAD',
    "headers": baseHeaders
  }
  const response = await fetch(url, options)
  return response.headers
}

async function downloadFilePart (url, startByte, endByte) {
  const headers = {
    'Range': `bytes=${startByte}-${endByte}`
  }

  const buffer = await fetchWithNothing(url, { headers: {...baseHeaders, ...headers} })
  console.log(`done part ${startByte}-${endByte}`)
  return buffer
}

async function downloadFileManyPart (url, numParts) {
  const responseHead = await fetchHead(url)
  const contentLength = Number(responseHead.get('content-length'))
  
  if (contentLength) {
    const partSize = Math.ceil(contentLength / numParts)
    const partPromises = []

    for (let i = 0; i < numParts; i++) {
      const startByte = i * partSize
      const endByte = (i + 1) === numParts ? contentLength : (i + 1) * partSize
      partPromises.push(downloadFilePart(url, startByte, endByte))
    }

    const downloadedParts = await Promise.all(partPromises)
    const downloadedFile = Buffer.concat(downloadedParts)
    return downloadedFile
  } else {
    return Buffer.from([])
  }
}

function getJSONHttp (url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''

      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        let json = JSON.parse(data)
        resolve(json)
      })
    })
  })
}

function downloadFileHttp (url, filepath) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      streamPipeline(res, fs.createWriteStream(filepath)).then(resolve)
    })

    req.setTimeout(3000)
    req.on('timeout', () => {
      console.log(`timeout: ${url}`)
      downloadFileHttp(url, filepath).then(resolve)
    })
  })
}

// Function to download an image from a given URL
const downloadImage = async (url, fileName, maxDownload) => {
  if (downlaodedCount >= maxDownload) {
    return false
  }
  try {
    await downloadFileHttp(url, path.resolve(outputDir, fileName))
    downlaodedCount++
    console.log(`done: ${downlaodedCount} ${url}`)
    return true
  } catch {
    return false
  }
  // Use fetch to send a GET request to the URL
  // const options = {
  //   method: 'GET',
  //   "headers": baseHeaders
  // }
  // const response = await fetchWithTimeout(url, options);
  // // Check if the request was successful
  // if (response.ok) {
  //   // Create a write stream to save the image to a file
  //   const fileStream = fs.createWriteStream(path.resolve(outputDir, fileName));
  //   // Pipe the response stream into the write stream
  //   await streamPipeline(response.body, fileStream)
  //   downlaodedCount++
  //   console.log(`done: ${downlaodedCount} ${url}`)
  //   return true
  // } else {
  //   return false
  // }
}

async function downloadTags (tag_string, fileName) {
  return fs.writeFile(path.resolve(outputDir, fileName), tag_string.replace(/ /g, ','))
}

// Function to get images from the JSON API and download them
const getImages = async (tags, limit, page, isDownloadSample) => {
  // Use fetch to send a GET request to the API endpoint
  const response = await fetch(`${POST_URL}?tags=${tags}&limit=${limit}&page=${page}`);
  // Check if the request was successful
  if (response.ok) {
    // Parse the response as JSON
    const json = await response.json();

    await Promise.all(json.map(image => {
      const downlaodUrl = (isDownloadSample ? image.jpeg_url : image.file_url) || image.file_url

      if (downlaodUrl) {
        const filePathInUrl = urlparse(downlaodUrl)
        const file_ext = path.extname(filePathInUrl.pathname)

        // downloadTags(image.tag_string, `${image.id}.txt`)
        return plimit(() => downloadImage(downlaodUrl, `${image.id}${file_ext}`))
      } else {
        return false
      }
    }))

    return json
  } else {
    const text = await response.text()
    console.error(text)
    return []
  }
}

const getImages_gelbooru = async (tags, limit, page, isDownloadSample, maxDownload) => {
  const post_url = `https://gelbooru.com/index.php`
  const fetch_url = `${post_url}?tags=${encodeURIComponent(tags)}&page=dapi&s=post&q=index&limit=${limit}&pid=${page}&json=1`
  const json = await getJSONHttp(fetch_url);
  // Check if the request was successful
  if (json) {
    // Parse the response as JSON
    const { post } = json
    let tasks = []

    for (let image of post) {
      const task = plimit(async () => {
        const downlaodUrl = image.file_url

        if (downlaodUrl) {
          const filePathInUrl = urlparse(downlaodUrl)
          const file_ext = path.extname(filePathInUrl.pathname)
  
          downloadedMap.set(image.id, { id: image.id, url: downlaodUrl, complete: false })
  
          const result = await downloadImage(downlaodUrl, `${image.id}${file_ext}`, maxDownload)
          const info = downloadedMap.get(image.id)
          info.complete = result
        }
      })

      tasks.push(task)
    }

    await Promise.all(tasks)

    console.log(downloadedMap)

    return post
  } else {
    const text = await response.text()
    console.error(text)
    return []
  }
}

// Main function
const main = async (tags, isDownloadSample, method = getImages, maxDownload = 100) => {
  await fs.ensureDir(outputDir)
  // Download the first 10 pages of images
  for (let i of [0]) {
    // Get and download the images for each page
    let items = await method(tags, 100, i, isDownloadSample, maxDownload);

    if (items.length === 0) {
      break
    }
  }
}

async function download_popular_by_month (month, year, isDownloadSample) {
  const response = await fetch(`https://${TARGET_HOST}/post/popular_by_month.json?month=${month}&year=${year}`)

  if (response.ok) {
    // Parse the response as JSON
    const json = await response.json();

    await Promise.all(json.map(image => {
      const downlaodUrl = isDownloadSample ? image.sample_url : image.file_url
      return plimit(() => downloadImage(downlaodUrl, `${image.id}.${image.file_ext}`))
    }))

    return json
  } else {
    return []
  }
}

outputDir = 'output/eula_(genshin_impact)'
// Call the main function
main('eula_(genshin_impact) school_uniform solo -rating:e -rating:q sort:score', true, getImages_gelbooru, 30);
// download_popular_by_month(2, 2023, true)