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
                console.log('ServiceWorker Installed Successfully, New Content Available');
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

  /* App Logic Goes Here */

  // Configure Localforage to store data from WordPress API
  localforage.config({
      driver: localforage.INDEXEDDB,
      name: 'Leaflet Review Data'
  });


  /* Attach event listeners to 'Read More' button on each article card */
  const addReadMoreClickEventListener = function() {
    const reviewSection = document.getElementById("reviews");

    reviewSection.addEventListener("click", function(e) {
      // prevent anchor tag from submitting and reloading page
      e.preventDefault();
      if (e.target.className === "readMoreButton") {
        // get current article from data attribute, store it in localforage then redirect to article page
        localforage.setItem('currentArticleIndex', e.target.dataset.articleindex)
          .then(function(value) {
            // redirect back to article page
            window.location.href= e.target.href;
          });
      }
    });
  };

  /* Change background image of book cover image */
  const changeBookCoverBackgroundColor = function() {
    return new Promise(function(resolve, reject) {
      const colors = ['#F36A6F', '#65A3F6', '#9FF6B7', '#FECC48'];
      const bookCoverElems =
      document.getElementsByClassName('review__card__bookCover');
      for (let i = 0; i < bookCoverElems.length; i++) {
        let colorIndex = i % 4;
        bookCoverElems[i].style.backgroundColor = colors[colorIndex];
      }
      resolve('Update data in the background');
    })
  };

  /* Renders content into article page and index page using Handlebars */
  const render = function(data, whichPage) {

    if (whichPage === 'articlePage') {
      // Render article page
      const currentArticleIndex =
        localforage.getItem('currentArticleIndex').then(function(index) {

        // If article index isn't found in localforage, redirect back to index.html
        if (!index) {
          console.error('Article index not found in localforage');
          window.location.href=window.location.origin;
          return;
        }

        const articleData = data[index];
        const templateScript = document.getElementById('article-container').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('articleContainer').innerHTML = template(articleData);
      });

    } else {
      // Render index page
      return new Promise(function(resolve) {
        console.log('rendering data : ', data);
        const templateScript = document.getElementById('review-cards').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('reviews').innerHTML = template(data);
        resolve(data);
      });
    }
  };

  /* Returns fetch API to get data from WordPress */
  const fetchData = function(type) {

    // type is either 'posts' or 'tags' and we generate requestUrl according to whichever one is passed
    const requestUrl = `https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%20%3D%22http%3A%2F%2Fwww.minseoalexkim.com%2Fwp-json%2Fwp%2Fv2%2F${type}%22&format=json&diagnostics=true&callback=`;

    // Add 'cors' as mode since we're making a Cross-Origins Request
    return fetch(requestUrl, {mode: 'cors'});
  };

  /* Examines request to make sure we got back valid response */
  const processRequest = function(response) {
    return new Promise(function(resolve) {
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
      response.json().then(function(responseText) {
        resolve(responseText);
      });
    });
  };

  /* Processes and filters data into correct format */
  const processData = function(data) {
    // Filter for book reviews using categories( Category "36")
    let filteredData = data[0].filter(function(post) {
      return post.categories[0] === 36;
    });

    let tagMap = new Map();
    let allTagsList = [];

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
          allTagsList.push(tagName);
        }
      }

      //slice out time, keep only year-month-day
      let formattedDate = post.date.slice(0,10);

      return {
        date: formattedDate,
        title: post.title.rendered,
        previewText: preview,
        fullContent: post.content.rendered,
        image: post.better_featured_image.source_url,
        tags: tagNameList,
        index: index
      };
    });

    return {
      reviewData: processedData,
      allTagsList: allTagsList
    };
  };

  /* Saves data to localForage */
  const saveToLocalForage = function(dataObj) {
    // store review data('processedData') and list of all tags('allTagsList') in localforage
    localforage.setItem('reviewData', dataObj.reviewData).then((value) => {
      console.log('*****reviewData IN LOCALFORAGE', value);
    });
    localforage.setItem('tags', dataObj.allTagsList).then((value) => {
      console.log('*****allTagsList IN LOCALFORAGE', value);
    });

    return dataObj.reviewData;
  };

  const fetchAllData = function() {

    const reviewDataPromise = fetchData('posts').then(processRequest);
    const tagsDataPromise = fetchData('tags').then(processRequest);

    console.log('Data not found in localforage, fetching...');

    //make fetch requests and save to localForage
    Promise.all([reviewDataPromise, tagsDataPromise])
      .then(processData)
      .then(saveToLocalForage)
      .then(render)
      .then(changeBookCoverBackgroundColor)
      .catch(function(err) {
        console.error('Fetching data from WordPress failed because of :', err);
      });
  };

  const init = function() {

    let reviewDataFromLocal = localforage.getItem('reviewData');
    let tagDataFromLocal = localforage.getItem('tags');

    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      addReadMoreClickEventListener();
    }

    Promise.all([reviewDataFromLocal, tagDataFromLocal])
      .then(function(values) {
        if (values[0] === null || values[1] === null) {
          fetchAllData();
        } else {
          console.log('Successfully fetched data from localforage....');

          if (window.location.pathname === '/article.html') {
            render(values[0], 'articlePage');
         } else {
            render(values[0], 'main')
              .then(changeBookCoverBackgroundColor);
         }
        }
      }).catch(function(err) {
        console.error('Error in fetching from localforage :', err);
      })
  };

  //Start app
  init();

})();
