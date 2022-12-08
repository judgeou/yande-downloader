// Import required modules
import fetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent'
import fs from 'fs-extra';
import path from 'path'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import promiseLimit from 'promise-limit'

const streamPipeline = promisify(pipeline)
const plimit = promiseLimit(3)

const { http_proxy } = process.env
const agent = http_proxy ? new HttpsProxyAgent(http_proxy) : null

let outputDir = 'output'
let tags = 'kamisato_ayaka rating:safe score:>1'
let downlaodedCount = 0

// Function to download an image from a given URL
const downloadImage = async (url, fileName) => {
  // Use fetch to send a GET request to the URL
  const response = await fetch(url, {agent});
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

// Function to get images from the JSON API and download them
const getImages = async (limit, page) => {
  // Use fetch to send a GET request to the API endpoint
  const response = await fetch(`https://yande.re/post.json?tags=${tags}&limit=${limit}&page=${page}`, {agent});
  // Check if the request was successful
  if (response.ok) {
    // Parse the response as JSON
    const json = await response.json();

    await Promise.all(json.map(image => {
      return plimit(() => downloadImage(image.file_url, `${image.id}.${image.file_ext}`))
    }))

    return json
  } else {
    return []
  }
}

// Main function
const main = async () => {
  await fs.ensureDir(outputDir)
  // Download the first 10 pages of images
  for (let i = 1; i <= 10; i++) {
    // Get and download the images for each page
    let items = await getImages(100, i);

    if (items.length === 0) {
      break
    }
  }
}

// Call the main function
main();
