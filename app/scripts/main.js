/* eslint-env browser */
(function() {
  'use strict';

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // console.log(registration);
      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          var installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;

              case 'redundant':
                throw new Error('The installing ' +
                                'service worker became redundant.');

              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  // Custom JS Goes Here
  const changeBookCoverBackgroundColor = function() {
    const colors = ['#F36A6F', '#65A3F6', '#9FF6B7', '#FECC48'];
    const bookCoverElems =
    document.getElementsByClassName('review__card__bookCover');
    for (let i = 0; i < bookCoverElems.length; i++) {
      let colorIndex = i % 4;
      bookCoverElems[i].style.backgroundColor = colors[colorIndex];
    }
  };

  const render = function(data) {
    console.log('------------INSIDE RENDER FUNCTION--------');
    const templateScript = document.getElementById('review-cards').innerHTML;
    const template = Handlebars.compile(templateScript);
    document.getElementById('reviews').innerHTML = template(data);
  };

  const fetchData = function(type) {
    const postRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/posts';
    const tagsRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/tags';

    let requestUrl = type === 'reviews' ? postRequestUrl : tagsRequestUrl;
    return fetch(requestUrl, {'mode': 'cors'});
  };

  const processRequest = function(response) {
    // console.log('response from CACHE :-------->>>>>>>>>', response);
    return new Promise(function(resolve, reject) {
      if (response.type === 'opaque') {
        console.log('Received a response, but it\'s opaque so can\'t examine it');
        // Do something with the response (i.e. cache it for offline support)
        console.log(response);
        return;
      }

      if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ', response.status);
        return;
      }

      // Examine the text in the response
      console.log("Final Response", response);
      response.json().then(function(responseText) {
        console.log(responseText);
        resolve(responseText);
      });
    });
  };

  const processData = function(data) {

    // Filter for book reviews using categories( Category "36")
    let filteredData = data[0].filter(function(post) {
      return post.categories[0] === 36;
    });

    let tagMap = new Map();

    // create a map that maps tag id(number) with tag name
    data[1].forEach(function(tag) {
      tagMap.set(tag.id, tag.name);
    });

    // Map only the relevant properties
    const processedData = filteredData.map(function(post, index) {
      // Since the content of the post is in html format, we split it by newline and only take the first sentence of the post as preview text to show.
      let contentSplitted = post.content.rendered.split('\n');
      let preview = contentSplitted[0];

      let tagNameList = [];

      // Iterate over tags, getting tag name from each tag id using tagMap.
      for (let i = 0; i < post.tags.length; i++) {
        let tagName = tagMap.get(post.tags[i]);
        if (Boolean(tagName)) {
          tagNameList.push(tagName);
        }
      }

      return {
        date: post.date,
        title: post.title.rendered,
        previewText: preview,
        fullContent: post.content.rendered,
        image: post.better_featured_image.source_url,
        tags: tagNameList,
        index: index
      };
    });
    // console.log('Clean Data after request is done! :', processedData);
    return processedData;
  };

  // console.log(document.readyState);
  const reviewDataPromise = fetchData('reviews').then(processRequest);
  const tagsDataPromise = fetchData('tags').then(processRequest);

  Promise.all([reviewDataPromise, tagsDataPromise])
    .then(processData)
    .then(render)
    .then(changeBookCoverBackgroundColor)
    .catch(function(err) {
      console.error('PROMISE CHAIN BUSTED BECAUSE OF :', err);
    });
})();
