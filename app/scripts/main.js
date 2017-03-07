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
  const postRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/posts';
  const tagsRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/tags';
  let dataObj = {
    postData: '',
    tagsData: ''
  };

  const fetchData = function(requestUrl, type, dataObj) {
    return new Promise(function(resolve, reject) {
      const request = new XMLHttpRequest();
      request.open('GET', requestUrl);

      request.onload = function() {
        // if status is 200
        if (request.status === 200) {
          // resolve promise with response
          if (type === 'post') {
            dataObj.postData = request.responseText;
          } else {
            dataObj.tagsData = request.responseText;
          }
          resolve(dataObj);
        } else {
          // otherwise reject with status text
          reject(Error(request.statusText));
        }
      };
      // Handling network errors
      request.onerror = function() {
        reject(Error('Network Error!'));
      };
      request.send();
    });
  };

  const processData = function(response) {
    let cleanedDataObj = {
      postData: '',
      tagMap: new Map()
    };

    let tagsData = JSON.parse(response.tagsData);
    let postData = JSON.parse(response.postData);
    // Process post data first
    // Parse JSON data and then filter for book reviews using categories( Category "36")
    let filteredData = postData.filter(function(post) {
      return post.categories[0] === 36;
    });
    // Map only the relevant properties
    const processedPostData = filteredData.map(function(post, index) {
      let contentSplitted = post.content.rendered.split('\n');
      let preview = contentSplitted[0] + contentSplitted[1];
      return {
        date: post.date,
        title: post.title.rendered,
        previewText: preview,
        fullContent: post.content.rendered,
        image: post.better_featured_image.source_url,
        tags: post.tags,
        index : index
      };
    });

    // Process tag data
    tagsData.forEach(function(tag) {
      cleanedDataObj.tagMap.set(tag.id, tag.name);
    });

    // Attach processed data to cleaned data object
    cleanedDataObj.postData = processedPostData;
    return cleanedDataObj;
  };

  // const findTagNames = function(dataObj) {
  //   console.log('----finding TAG NAMES-----');
  //   dataObj.postData.forEach(function(review) {
  //     let tagsArray = review.tags;
  //     let tagMap = dataObj.tagMap;
  //     for (let i = 0; i < tagsArray.length; i++) {
  //       tagsArray[i] = tagMap.get(tagsArray[i]);
  //     }
  //   });
  //   console.log(dataObj);
  //   return dataObj;
  // };

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
    const reviewData = data;
    console.log(reviewData);
    const templateScript = document.getElementById('review-cards').innerHTML;
    const template = Handlebars.compile(templateScript);
    document.getElementById('reviews').innerHTML = template(reviewData);
  };

  /* fetch post data, then filter/process it, and render it */
  fetchData(postRequestUrl, 'post', dataObj)
    .then(fetchData(tagsRequestUrl, 'tags', dataObj))
    .then(processData)
    // .then(findTagNames)
    .then(render)
    .then(changeBookCoverBackgroundColor)
    .catch(function(reason) {
      console.error('Caught error for this :', reason);
    });
})();
