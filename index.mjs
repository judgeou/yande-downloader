// Import required modules
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path'
import { parse as urlparse } from 'url'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'
import proxy from 'node-global-proxy'

const streamPipeline = promisify(pipeline)
const plimit = promiseLimit(2)
const POST_URL = `https://danbooru.donmai.us/posts.json`
// const POST_URL = `https://yande.re/post.json`
// const POST_URL = `https://konachan.com/post.json`

proxy.default.setConfig({
  http: process.env.http_proxy,
  https: process.env.https_proxy
})
proxy.default.start()

const baseHeaders = {
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  'Accept-Encoding': 'gzip, deflate, br',
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  'Cache-Control': 'no-cache, no-store, must-revalidate',
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
const maxDownload = 150

async function fetchWithTimeout(url, options, timeout = 10000) {
  while (1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const result = await fetch(url, { signal: controller.signal, ...options });
      clearTimeout(timeoutId)
      return result
    } catch {
      console.log(`retry ${url}`)
      continue
    }
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

  const response = await fetch(url, { headers: {...baseHeaders, ...headers} })
  return bodyToBuffer(response.body)
}

async function downloadFileManyPart (url, numParts) {
  const responseHead = await fetchHead(url)
  const contentLength = Number(responseHead.get('content-length'))
  
  if (contentLength) {
    const partSize = Math.ceil(contentLength / numParts)
    const partPromises = []

    for (let i = 0; i < numParts; i++) {
      const startByte = i * partSize
      const endByte = (i + 1) === numParts ? contentLength - 1 : (i + 1) * partSize - 1
      partPromises.push(downloadFilePart(url, startByte, endByte))
    }

    const downloadedParts = await Promise.all(partPromises)
    const downloadedFile = Buffer.concat(downloadedParts)
    return downloadedFile
  }
}

// Function to download an image from a given URL
const downloadImage = async (url, fileName) => {
  if (downlaodedCount >= maxDownload) {
    return false
  }
  try {
    const buffer = await downloadFileManyPart(url, 4)
    await fs.writeFile(path.resolve(outputDir, fileName), buffer)
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

const getImages_gelbooru = async (tags, limit, page) => {
  const post_url = `https://gelbooru.com/index.php`
  const fetch_url = `${post_url}?tags=${tags}&page=dapi&s=post&q=index&limit=${limit}&pid=${page}&json=1`
  const response = await fetch(fetch_url);
  // Check if the request was successful
  if (response.ok) {
    // Parse the response as JSON
    const json = await response.json();
    const { post } = json
    let tasks = []

    for (let image of post) {
      const task = plimit(async () => {
        const downlaodUrl = image.file_url

        if (downlaodUrl) {
          const filePathInUrl = urlparse(downlaodUrl)
          const file_ext = path.extname(filePathInUrl.pathname)
  
          downloadedMap.set(image.id, { id: image.id, url: downlaodUrl, complete: false })
  
          const result = await downloadImage(downlaodUrl, `${image.id}${file_ext}`)
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
const main = async (tags, isDownloadSample, method = getImages) => {
  await fs.ensureDir(outputDir)
  // Download the first 10 pages of images
  for (let i of [0,1]) {
    // Get and download the images for each page
    let items = await method(tags, 100, i, isDownloadSample);

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

outputDir = 'output/devil_heavens'
// Call the main function
main('panties_under_pantyhose -rating:e -rating:q', true, getImages_gelbooru);
// download_popular_by_month(2, 2023, true)