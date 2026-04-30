import {type AstroIntegration} from 'astro'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'path'

import {
  type ErrorCode,
  type HTAccessFileOptions,
  htAccessFileContent
} from './lib/htaccess'

const {writeFile} = fs.promises

interface HTAccessManagerConfiguration {
  astroCaching?: boolean
  manualFiles?: {
    [htaccessfilepath: string]: Omit<HTAccessFileOptions, 'topLevelFile'>
  }
  cachingRules?: HTAccessFileOptions['cachingRules']
}

const errorPageRegex = /\/([345]\d\d)$/

export const htAccessManager = (options: HTAccessManagerConfiguration) => {
  const htAccessFiles: {[pathname: string]: HTAccessFileOptions} = {
    '/.htaccess': {topLevelFile: true}
  }

  if (options.manualFiles) {
    Object.keys(options.manualFiles).forEach(filePath => {
      if (filePath !== '/.htaccess') {
        htAccessFiles[filePath] = {
          ...options.manualFiles![filePath],
          topLevelFile: false
        }
      }
    })
  }

  if (options.cachingRules) {
    htAccessFiles['/.htaccess'].cachingRules = options.cachingRules
  }

  const astroCaching =
    options.astroCaching === undefined ? false : options.astroCaching

  if (astroCaching) {
    htAccessFiles['/_astro/.htaccess'] = {
      topLevelFile: false,
      cachingRules: [{type: 'default', seconds: 86400 * 60}]
    }
  }

  let baseDir: string | undefined
  let write: boolean = true

  const integration: AstroIntegration = {
    name: 'astro-htaccess-manager',
    hooks: {
      'astro:config:setup': async ({config, logger}) => {
        if (options.manualFiles && options.manualFiles['/.htaccess']) {
          logger.warn(
            '/.htaccess is always created, use direct options to add to it.'
          )
        }

        if (config.output !== 'static') {
          logger.warn(
            'Site is not being built statically, HT Access Manager will not write any files.'
          )

          write = false
        }

        baseDir = fileURLToPath(config.outDir)
        logger.debug(`Output to ${baseDir}`)
      },
      'astro:routes:resolved': async ({logger, routes}) => {
        routes.forEach(route => {
          switch (route.type) {
            case 'page':
              const match = route.pattern.match(errorPageRegex)

              if (match && match[1]) {
                logger.debug(`Found error code page ${route.pattern}`)
                const code = parseInt(match[1]) as ErrorCode
                const htAccessFile = `${route.pattern.replace(`/${match[1]}`, '/.htaccess')}`

                if (!htAccessFiles[htAccessFile]) {
                  htAccessFiles[htAccessFile] = {
                    topLevelFile: false,
                    errorPages: [
                      {
                        code,
                        filePath: route.pattern
                      }
                    ]
                  }
                  return
                }

                if (!htAccessFiles[htAccessFile].errorPages) {
                  htAccessFiles[htAccessFile].errorPages = [
                    {code, filePath: route.pattern}
                  ]
                  return
                }

                htAccessFiles[htAccessFile].errorPages.push({
                  code,
                  filePath: route.pattern
                })
              }
              break
            case 'redirect':
              const htAccessFile = '/.htaccess'

              if (!htAccessFiles[htAccessFile]) {
                htAccessFiles[htAccessFile] = {
                  topLevelFile: htAccessFile === '/.htaccess',
                  redirects: [
                    {
                      status: 301,
                      source: route.pathname!,
                      destination: route.redirect! as string
                    }
                  ]
                }
                return
              }

              if (!htAccessFiles[htAccessFile].redirects) {
                htAccessFiles[htAccessFile].redirects = [
                  {
                    status: 301,
                    source: route.pathname!,
                    destination: route.redirect! as string
                  }
                ]

                return
              }

              htAccessFiles[htAccessFile].redirects.push({
                status: 301,
                source: route.pathname!,
                destination: route.redirect! as string
              })

              break
          }
        })
      },
      'astro:build:done': async ({logger}) => {
        const files = Object.keys(htAccessFiles).map(fileName => {
          return {
            fileName,
            contents: htAccessFileContent(htAccessFiles[fileName])
          }
        })

        if (write) {
          const promises = files.map(({fileName, contents}) => {
            return new Promise<void>(async resolve => {
              await writeFile(path.join(baseDir!, fileName), contents)
              resolve()
            })
          })

          await Promise.all(promises)
          logger.info(`Written ${files.length} .htaccess files`)
        }
      }
    }
  }

  return integration
}

export default htAccessManager
