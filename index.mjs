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
const plimit = promiseLimit(3)
const POST_URL = `https://danbooru.donmai.us/posts.json`
// const POST_URL = `https://yande.re/post.json`
// const POST_URL = `https://konachan.com/post.json`

proxy.default.setConfig({
  http: process.env.http_proxy,
  https: process.env.https_proxy
})
proxy.default.start()

let outputDir = 'output'
let downlaodedCount = 0

// Function to download an image from a given URL
const downloadImage = async (url, fileName) => {
  // Use fetch to send a GET request to the URL
  const response = await fetch(url);
  // Check if the request was successful
  if (response.ok) {
    // Create a write stream to save the image to a file
    const fileStream = fs.createWriteStream(path.resolve(outputDir, fileName));
    // Pipe the response stream into the write stream
    await streamPipeline(response.body, fileStream)
    downlaodedCount++
    console.log(`download: ${downlaodedCount}`)
  }
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

// Main function
const main = async (tags, isDownloadSample) => {
  await fs.ensureDir(outputDir)
  // Download the first 10 pages of images
  for (let i of [1]) {
    // Get and download the images for each page
    let items = await getImages(tags, 100, i, isDownloadSample);

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

outputDir = 'output/chen_bin'
// Call the main function
main('chen_bin', true);
// download_popular_by_month(2, 2023, true)