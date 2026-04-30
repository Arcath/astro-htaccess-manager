import {describe, expect, it} from 'vitest'

import {htAccessFileContent} from '../../src/lib/htaccess'

describe('HT Access File', () => {
  it('should generate an error document', () => {
    const file = htAccessFileContent({
      topLevelFile: true,
      errorPages: [{code: 404, filePath: '/404.html'}]
    })

    expect(file).toMatch(/ErrorDocument 404/)
  })

  it('should generate a cache rule', () => {
    const file = htAccessFileContent({
      topLevelFile: true,
      cachingRules: [{type: 'jpg', seconds: 1234}]
    })

    expect(file).toMatch(/jpg/)
    expect(file).toMatch(/Header set Cache-Control "max-age=1234, public"/)
  })

  it('should generate a redirect', () => {
    const file = htAccessFileContent({
      topLevelFile: true,
      redirects: [{status: 301, source: '/foo', destination: '/bar'}]
    })

    expect(file).toMatch(/RedirectMatch 301/)
  })
})
