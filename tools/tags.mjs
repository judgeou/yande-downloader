import fs from 'fs-extra'
import path from 'path'

const target_path = `F:\\project\\kohya_ss\\train\\dataset\\march_7th\\1_march_7th`

async function main () {
  const dirs = await fs.readdir(target_path)

  const tags_list = []
  const tags_count = {}
  
  for (let file of dirs) {
    if (path.extname(file) === '.txt') {
      const buf = await fs.readFile(path.resolve(target_path, file))
      const text = buf.toString('utf-8')
      const tags = text.split(',').map(item => item.trim())

      for (let tag of tags) {
        tags_list.push(tag)
        tags_count[tag] = (tags_count[tag] || 0) + 1
      }
    }
  }

  const tags_keys = Object.keys(tags_count)
  const tags_items = tags_keys.map(key => {
    return {
      tag: key,
      count: tags_count[key]
    }
  }).sort((a, b) => b.count - a.count).slice(0, 50)

  for (let tag of tags_items) {
    console.log(tag)
  }
}

main()