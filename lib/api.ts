import fs from 'fs'
import path, { parse } from 'path'
import matter from 'gray-matter'
import { getFilesRecursively } from './modules/find-files-recusively.mjs'
import { getMDExcerpt } from './markdownToHtml'
import PostType from '../interfaces/post.js'

const mdDir = path.join(process.cwd(), process.env.COMMON_MD_DIR)

export async function getPostBySlug(slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = path.join(mdDir, `${realSlug}.md`)
  const data = await parseFileToObj(fullPath);

  type Items = {
    [key: string]: string
  }

  const items: Items = {}

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug
    }

    if (typeof data[field] !== 'undefined') {
      items[field] = data[field]
    }
  })
  return items
}

async function parseFileToObj(path: string) {
  const fileContents = fs.readFileSync(path, 'utf8')
  const { data, content } = matter(fileContents)

  data['content'] = content

  // modify obj
  if (typeof data['excerpt'] === 'undefined') {
    data['excerpt'] = await getMDExcerpt(content, 500);
  }
  if (typeof data['date'] !== 'undefined') {
    data['date'] = data['date'].toString()
  }
  return data
}

export async function getAllPosts(fields: string[] = []) {
  let files = getFilesRecursively(mdDir, /\.md/);
  let posts = await Promise.all(files
    .map((slug) => getPostBySlug(slug, fields)))
    // sort posts by date in descending order
  posts = posts.sort((post1, post2) => (post1.date > post2.date ? -1 : 1))
  return posts
}

export async function getLinksMapping() {
  const linksMapping = new Map<string, string[]>();
  const postsMapping = new Map((await getAllPosts(['slug', 'content'])).map(i => [i.slug, i.content]));
  const allSlugs = new Set(postsMapping.keys());
  postsMapping.forEach((content, slug) => {
    const mdLink = /\[[^\[\]]+\]\(([^\(\)]+)\)/g
    const matches = Array.from(content.matchAll(mdLink))
    const linkSlugs = []
    for (var m of matches) {
      const linkSlug = getSlugFromHref(slug, m[1])
      if (allSlugs.has(linkSlug)) {
        linkSlugs.push(linkSlug);
      }
    }
    linksMapping[slug] = linkSlugs
  });
  return linksMapping;
}

export function getSlugFromHref (currSlug: string, href: string) {
  return decodeURI(path.join(...currSlug.split(path.sep).slice(0, -1), href)).replace(/\.md$/, '')
}

export function updateMarkdownLinks(markdown: string, currSlug: string) {
  // remove `.md` from links
  markdown = markdown.replaceAll(/(\[[^\[\]]+\]\([^\(\)]+)(\.md)(\))/g, "$1$3");

  // update image links
  markdown = markdown.replaceAll(/(\[[^\[\]]*\]\()([^\(\)]+)(\))/g, (m, m1, m2, m3) => {
    const relLink = m2
    const slugDir = path.join(...currSlug.split(path.sep).slice(0, -1))
    const fileSlug = path.join(mdDir, path.dirname(slugDir), relLink)
    if (fs.existsSync(fileSlug)) {
      const relAssetDir = path.relative('./public', process.env.MD_ASSET_DIR)
      const imgPath = path.join(relAssetDir, relLink)
      return `${m1}${imgPath}${m3}`
    }
    return m;
  });
  return markdown
}
