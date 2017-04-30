# Leaflet
[Leaflet](https://leaflet-d2550.firebaseapp.com/index.html) is [*progressive web app*](https://developers.google.com/web/progressive-web-apps/) that fetches data from book reviews posted on [my personal blog](http://www.minseoalexkim.com) using the WordPress API. It's fully responsive across all devices, and on Chrome uses a service worker for faster page load on repeated visits. It even works offline!
![Preview](http://i67.tinypic.com/2weie8j.jpg)

## Table of Contents
  - [Features](#features)
  - [Built With](#built-with)
  - [Contribution Guide](#contribution-guide)
  - [Future Features](#future-Features)

## Features
- For every book review posted on my personal blog, Leaflet will fetch it and create a post.
- Service worker allows lightning-fast loads on repeated visits, and app works offline.

## Built With
- Vanilla JavaScript
- [Handlebars.js](http://handlebarsjs.com/)
- Lots of cups of [Tea](http://www.tazo.com/)

## Contribution Guide
Just fork it, and make a pull request! More contributions are always welcome

## Future Features
- Add Push Notification feature
- Allow to sort posts by category
- Use database(firebase?) to support offline storage for non-Chrome environments. Right now I'm using [localforage](https://github.com/localForage/localForage), a wrapper over IndexedDB that doesn't have great cross-browser support.
- Play with adding ReactJS as a view-layer.
