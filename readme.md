# Astro HT Access Manager

Plugin for Astro that handles automatic generation of multiple htaccess files.

By default it will:

- Create `/.htaccess` with:
  - Any redirects defined in your astro config
  - Any error code pages e.g. `404.html`
- Create `/_astro/.htaccess` which has a catch all caching rule for 60 days.
- Anywhere it finds an error code page e.g. `/blog/404` it will create
  `/blog/.htaccess` to use that error page instead.

You can then:

- Create any `.htaccess` you need with custom rules. These rules are merged with
  the existing automatic detection.

## Install

```
astro add astro-htaccess-manager
```

## Configure

```js
astroHtaccessManager({
  astroCaching: true
  manualFiles: {
    '/assets': {
      cachingRules: [{type: 'jpg|png', seconds: 84600}]
    }
  }
  cachingRules: [{type: 'jpg|png', seconds: 60}]
})
```
