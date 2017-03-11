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


  const clickHandler = function(e) {
      // prevent anchor tag from submitting and reloading page
      e.preventDefault();

      if (e.target.className === "readMoreButton") {

        if (!window.fetch) {
          console.log('saving article index to localStorage');
          window.localStorage.setItem('currentArticleIndex', e.target.dataset.articleindex);
          window.location.href = e.target.href;
        } else {
        // get current article from data attribute, store it in localforage then redirect to article page
          localforage.setItem('currentArticleIndex', e.target.dataset.articleindex)
            .then(function(value) {
              // redirect back to article page
              window.location.href= e.target.href;
            });
        }
      }
  };

  /* Attach event listeners to 'Read More' button on each article card */
  const addReadMoreClickEventListener = function() {
    const reviewSection = document.getElementById("reviews");
    reviewSection.addEventListener("click", clickHandler);
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

    if (window.location.pathname === '/article.html') {
      let currentArticleIndex;

      // get article index from localStorage
      if (!window.fetch) {
        currentArticleIndex = window.localStorage.getItem("currentArticleIndex");

        console.log('RENDERING ARTICLE PAGE');
        console.log('currentArticleIndex = :', currentArticleIndex);
        const articleData = data[currentArticleIndex];
        const templateScript = document.getElementById('article-container').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('articleContainer').innerHTML = template(articleData);
      } else {
          // Render article page from localforage
          currentArticleIndex =
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
        }

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

  const getAjax = function(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}

  /* Returns fetch API to get data from WordPress */
  const fetchData = function(type) {
    // type is either 'posts' or 'tags' and we generate requestUrl according to whichever one is passed
    const requestUrl = `https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%20%3D%22http%3A%2F%2Fwww.minseoalexkim.com%2Fwp-json%2Fwp%2Fv2%2F${type}%22&format=json&diagnostics=true&callback=`;

    if (window.fetch) {
      console.log('fetch detected!');
      // Add 'cors' as mode since we're making a Cross-Origins Request
      return fetch(requestUrl, {mode: 'cors'});
    } else {
      console.log('going ajax!');
      return getAjax(requestUrl);
    }
  };

  /**/
  const processAjaxRequest = function(response) {
    return new Promise(function(resolve, reject) {
      let result = JSON.parse(response).query.results.json.json;
      //add false flag to call processData with flag
      resolve(result);
    });
  };

  /* Examines request to make sure we got back valid response */
  const processRequest = function(response) {
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
      response.json().then(function(responseText) {
        let response = responseText.query.results.json.json;
        console.log(response);
        resolve(response);
      });
    });
  };

  /* Processes and filters data into correct format */
  const processData = function(data) {
    let postData = data[0];
    let tagData = data[1];

    // Filter for book reviews using categories( Category "36")
    let filteredData = postData.filter(function(post) {
      return post.categories === '36';
    });

    let tagMap = new Map();
    let allTagsList = [];

    // create a map that maps tag id(number) with tag name
    tagData.forEach(function(tag) {
      tagMap.set(tag.id, tag.name);
    });

    // Map only the relevant properties
    const reviewData = filteredData.map(function(post, index) {
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

    if (!window.fetch) {
      return reviewData;
    }

    return {
      reviewData: reviewData,
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

  const fetchAllData = function(flag) {

    let reviewDataPromise;
    let tagsDataPromise;

    if (flag === false) {
      // Case where localforage/indexDB is NOT supported.
      reviewDataPromise = fetchData('posts').then(processAjaxRequest);
      tagsDataPromise = fetchData('tags').then(processAjaxRequest);
      console.log('im fetchAllData am i getting called? Entered false flag');
      //make fetch requests and save to localForage
      Promise.all([reviewDataPromise, tagsDataPromise])
      .then(processData)
      .then(render)
      .then(changeBookCoverBackgroundColor)
      .catch(function(err) {
        console.error('Fetching data from WordPress failed because of :', err);
      });
    } else {

      reviewDataPromise = fetchData('posts').then(processRequest);
      tagsDataPromise = fetchData('tags').then(processRequest);
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
    }
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
          fetchAllData(true);
        } else {
          if (window.location.pathname === '/article.html') {
            render(values[0], 'articlePage');
         } else {
            render(values[0], 'main')
              .then(changeBookCoverBackgroundColor);
         }
        }
      }).catch(function(err) {
        fetchAllData(false);
        console.error('Error in fetching from localforage :', err);
      });
  };

  //Start app
  init();

})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlZ2lzdHJhdGlvbik7XG4gICAgICAvLyB1cGRhdGVmb3VuZCBpcyBmaXJlZCBpZiBzZXJ2aWNlLXdvcmtlci5qcyBjaGFuZ2VzLlxuICAgICAgcmVnaXN0cmF0aW9uLm9udXBkYXRlZm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdXBkYXRlZm91bmQgaXMgYWxzbyBmaXJlZCB0aGUgdmVyeSBmaXJzdCB0aW1lIHRoZSBTVyBpcyBpbnN0YWxsZWQsXG4gICAgICAgIC8vIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcHJvbXB0IGZvciBhIHJlbG9hZCBhdCB0aGF0IHBvaW50LlxuICAgICAgICAvLyBTbyBjaGVjayBoZXJlIHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBhbHJlYWR5IGNvbnRyb2xsZWQsXG4gICAgICAgIC8vIGkuZS4gd2hldGhlciB0aGVyZSdzIGFuIGV4aXN0aW5nIHNlcnZpY2Ugd29ya2VyLlxuICAgICAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICAgIC8vIFRoZSB1cGRhdGVmb3VuZCBldmVudCBpbXBsaWVzIHRoYXQgcmVnaXN0cmF0aW9uLmluc3RhbGxpbmcgaXMgc2V0OlxuICAgICAgICAgIC8vIGh0dHBzOi8vc2xpZ2h0bHlvZmYuZ2l0aHViLmlvL1NlcnZpY2VXb3JrZXIvc3BlYy9zZXJ2aWNlX3dvcmtlci9pbmRleC5odG1sI3NlcnZpY2Utd29ya2VyLWNvbnRhaW5lci11cGRhdGVmb3VuZC1ldmVudFxuICAgICAgICAgIHZhciBpbnN0YWxsaW5nV29ya2VyID0gcmVnaXN0cmF0aW9uLmluc3RhbGxpbmc7XG5cbiAgICAgICAgICBpbnN0YWxsaW5nV29ya2VyLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoaW5zdGFsbGluZ1dvcmtlci5zdGF0ZSkge1xuICAgICAgICAgICAgICBjYXNlICdpbnN0YWxsZWQnOlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBvbGQgY29udGVudCB3aWxsIGhhdmUgYmVlbiBwdXJnZWQgYW5kIHRoZVxuICAgICAgICAgICAgICAgIC8vIGZyZXNoIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhY2hlLlxuICAgICAgICAgICAgICAgIC8vIEl0J3MgdGhlIHBlcmZlY3QgdGltZSB0byBkaXNwbGF5IGEgXCJOZXcgY29udGVudCBpc1xuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZTsgcGxlYXNlIHJlZnJlc2guXCIgbWVzc2FnZSBpbiB0aGUgcGFnZSdzIGludGVyZmFjZS5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmljZVdvcmtlciBJbnN0YWxsZWQgU3VjY2Vzc2Z1bGx5LCBOZXcgQ29udGVudCBBdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlICdyZWR1bmRhbnQnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGluc3RhbGxpbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlIHdvcmtlciBiZWNhbWUgcmVkdW5kYW50LicpO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgc2VydmljZSB3b3JrZXIgcmVnaXN0cmF0aW9uOicsIGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyogQXBwIExvZ2ljIEdvZXMgSGVyZSAqL1xuXG4gIC8vIENvbmZpZ3VyZSBMb2NhbGZvcmFnZSB0byBzdG9yZSBkYXRhIGZyb20gV29yZFByZXNzIEFQSVxuICBsb2NhbGZvcmFnZS5jb25maWcoe1xuICAgICAgZHJpdmVyOiBsb2NhbGZvcmFnZS5JTkRFWEVEREIsXG4gICAgICBuYW1lOiAnTGVhZmxldCBSZXZpZXcgRGF0YSdcbiAgfSk7XG5cblxuICBjb25zdCBjbGlja0hhbmRsZXIgPSBmdW5jdGlvbihlKSB7XG4gICAgICAvLyBwcmV2ZW50IGFuY2hvciB0YWcgZnJvbSBzdWJtaXR0aW5nIGFuZCByZWxvYWRpbmcgcGFnZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICBpZiAoZS50YXJnZXQuY2xhc3NOYW1lID09PSBcInJlYWRNb3JlQnV0dG9uXCIpIHtcblxuICAgICAgICBpZiAoIXdpbmRvdy5mZXRjaCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdzYXZpbmcgYXJ0aWNsZSBpbmRleCB0byBsb2NhbFN0b3JhZ2UnKTtcbiAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2N1cnJlbnRBcnRpY2xlSW5kZXgnLCBlLnRhcmdldC5kYXRhc2V0LmFydGljbGVpbmRleCk7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBlLnRhcmdldC5ocmVmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBnZXQgY3VycmVudCBhcnRpY2xlIGZyb20gZGF0YSBhdHRyaWJ1dGUsIHN0b3JlIGl0IGluIGxvY2FsZm9yYWdlIHRoZW4gcmVkaXJlY3QgdG8gYXJ0aWNsZSBwYWdlXG4gICAgICAgICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgnY3VycmVudEFydGljbGVJbmRleCcsIGUudGFyZ2V0LmRhdGFzZXQuYXJ0aWNsZWluZGV4KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgYmFjayB0byBhcnRpY2xlIHBhZ2VcbiAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWY9IGUudGFyZ2V0LmhyZWY7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICB9O1xuXG4gIC8qIEF0dGFjaCBldmVudCBsaXN0ZW5lcnMgdG8gJ1JlYWQgTW9yZScgYnV0dG9uIG9uIGVhY2ggYXJ0aWNsZSBjYXJkICovXG4gIGNvbnN0IGFkZFJlYWRNb3JlQ2xpY2tFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgcmV2aWV3U2VjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmV2aWV3c1wiKTtcbiAgICByZXZpZXdTZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGlja0hhbmRsZXIpO1xuICB9O1xuXG4gIC8qIENoYW5nZSBiYWNrZ3JvdW5kIGltYWdlIG9mIGJvb2sgY292ZXIgaW1hZ2UgKi9cbiAgY29uc3QgY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY29uc3QgY29sb3JzID0gWycjRjM2QTZGJywgJyM2NUEzRjYnLCAnIzlGRjZCNycsICcjRkVDQzQ4J107XG4gICAgICBjb25zdCBib29rQ292ZXJFbGVtcyA9XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXZpZXdfX2NhcmRfX2Jvb2tDb3ZlcicpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBib29rQ292ZXJFbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgY29sb3JJbmRleCA9IGkgJSA0O1xuICAgICAgICBib29rQ292ZXJFbGVtc1tpXS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcnNbY29sb3JJbmRleF07XG4gICAgICB9XG4gICAgICByZXNvbHZlKCdVcGRhdGUgZGF0YSBpbiB0aGUgYmFja2dyb3VuZCcpO1xuICAgIH0pXG4gIH07XG5cbiAgLyogUmVuZGVycyBjb250ZW50IGludG8gYXJ0aWNsZSBwYWdlIGFuZCBpbmRleCBwYWdlIHVzaW5nIEhhbmRsZWJhcnMgKi9cbiAgY29uc3QgcmVuZGVyID0gZnVuY3Rpb24oZGF0YSwgd2hpY2hQYWdlKSB7XG5cbiAgICBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID09PSAnL2FydGljbGUuaHRtbCcpIHtcbiAgICAgIGxldCBjdXJyZW50QXJ0aWNsZUluZGV4O1xuXG4gICAgICAvLyBnZXQgYXJ0aWNsZSBpbmRleCBmcm9tIGxvY2FsU3RvcmFnZVxuICAgICAgaWYgKCF3aW5kb3cuZmV0Y2gpIHtcbiAgICAgICAgY3VycmVudEFydGljbGVJbmRleCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1cnJlbnRBcnRpY2xlSW5kZXhcIik7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1JFTkRFUklORyBBUlRJQ0xFIFBBR0UnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ2N1cnJlbnRBcnRpY2xlSW5kZXggPSA6JywgY3VycmVudEFydGljbGVJbmRleCk7XG4gICAgICAgIGNvbnN0IGFydGljbGVEYXRhID0gZGF0YVtjdXJyZW50QXJ0aWNsZUluZGV4XTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXJ0aWNsZS1jb250YWluZXInKS5pbm5lckhUTUw7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FydGljbGVDb250YWluZXInKS5pbm5lckhUTUwgPSB0ZW1wbGF0ZShhcnRpY2xlRGF0YSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFJlbmRlciBhcnRpY2xlIHBhZ2UgZnJvbSBsb2NhbGZvcmFnZVxuICAgICAgICAgIGN1cnJlbnRBcnRpY2xlSW5kZXggPVxuICAgICAgICAgICAgbG9jYWxmb3JhZ2UuZ2V0SXRlbSgnY3VycmVudEFydGljbGVJbmRleCcpLnRoZW4oZnVuY3Rpb24oaW5kZXgpIHtcblxuICAgICAgICAgICAgLy8gSWYgYXJ0aWNsZSBpbmRleCBpc24ndCBmb3VuZCBpbiBsb2NhbGZvcmFnZSwgcmVkaXJlY3QgYmFjayB0byBpbmRleC5odG1sXG4gICAgICAgICAgICBpZiAoIWluZGV4KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FydGljbGUgaW5kZXggbm90IGZvdW5kIGluIGxvY2FsZm9yYWdlJyk7XG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmPXdpbmRvdy5sb2NhdGlvbi5vcmlnaW47XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcnRpY2xlRGF0YSA9IGRhdGFbaW5kZXhdO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlU2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FydGljbGUtY29udGFpbmVyJykuaW5uZXJIVE1MO1xuICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXJ0aWNsZUNvbnRhaW5lcicpLmlubmVySFRNTCA9IHRlbXBsYXRlKGFydGljbGVEYXRhKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFJlbmRlciBpbmRleCBwYWdlXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICBjb25zb2xlLmxvZygncmVuZGVyaW5nIGRhdGEgOiAnLCBkYXRhKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3LWNhcmRzJykuaW5uZXJIVE1MO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZSh0ZW1wbGF0ZVNjcmlwdCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzJykuaW5uZXJIVE1MID0gdGVtcGxhdGUoZGF0YSk7XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgZ2V0QWpheCA9IGZ1bmN0aW9uKHVybCkge1xuICAvLyBSZXR1cm4gYSBuZXcgcHJvbWlzZS5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIC8vIERvIHRoZSB1c3VhbCBYSFIgc3R1ZmZcbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4oJ0dFVCcsIHVybCk7XG5cbiAgICByZXEub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAvLyBUaGlzIGlzIGNhbGxlZCBldmVuIG9uIDQwNCBldGNcbiAgICAgIC8vIHNvIGNoZWNrIHRoZSBzdGF0dXNcbiAgICAgIGlmIChyZXEuc3RhdHVzID09IDIwMCkge1xuICAgICAgICAvLyBSZXNvbHZlIHRoZSBwcm9taXNlIHdpdGggdGhlIHJlc3BvbnNlIHRleHRcbiAgICAgICAgcmVzb2x2ZShyZXEucmVzcG9uc2UpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSByZWplY3Qgd2l0aCB0aGUgc3RhdHVzIHRleHRcbiAgICAgICAgLy8gd2hpY2ggd2lsbCBob3BlZnVsbHkgYmUgYSBtZWFuaW5nZnVsIGVycm9yXG4gICAgICAgIHJlamVjdChFcnJvcihyZXEuc3RhdHVzVGV4dCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgbmV0d29yayBlcnJvcnNcbiAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmVqZWN0KEVycm9yKFwiTmV0d29yayBFcnJvclwiKSk7XG4gICAgfTtcblxuICAgIC8vIE1ha2UgdGhlIHJlcXVlc3RcbiAgICByZXEuc2VuZCgpO1xuICB9KTtcbn1cblxuICAvKiBSZXR1cm5zIGZldGNoIEFQSSB0byBnZXQgZGF0YSBmcm9tIFdvcmRQcmVzcyAqL1xuICBjb25zdCBmZXRjaERhdGEgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgLy8gdHlwZSBpcyBlaXRoZXIgJ3Bvc3RzJyBvciAndGFncycgYW5kIHdlIGdlbmVyYXRlIHJlcXVlc3RVcmwgYWNjb3JkaW5nIHRvIHdoaWNoZXZlciBvbmUgaXMgcGFzc2VkXG4gICAgY29uc3QgcmVxdWVzdFVybCA9IGBodHRwczovL3F1ZXJ5LnlhaG9vYXBpcy5jb20vdjEvcHVibGljL3lxbD9xPXNlbGVjdCUyMColMjBmcm9tJTIwanNvbiUyMHdoZXJlJTIwdXJsJTIwJTNEJTIyaHR0cCUzQSUyRiUyRnd3dy5taW5zZW9hbGV4a2ltLmNvbSUyRndwLWpzb24lMkZ3cCUyRnYyJTJGJHt0eXBlfSUyMiZmb3JtYXQ9anNvbiZkaWFnbm9zdGljcz10cnVlJmNhbGxiYWNrPWA7XG5cbiAgICBpZiAod2luZG93LmZldGNoKSB7XG4gICAgICBjb25zb2xlLmxvZygnZmV0Y2ggZGV0ZWN0ZWQhJyk7XG4gICAgICAvLyBBZGQgJ2NvcnMnIGFzIG1vZGUgc2luY2Ugd2UncmUgbWFraW5nIGEgQ3Jvc3MtT3JpZ2lucyBSZXF1ZXN0XG4gICAgICByZXR1cm4gZmV0Y2gocmVxdWVzdFVybCwge21vZGU6ICdjb3JzJ30pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZygnZ29pbmcgYWpheCEnKTtcbiAgICAgIHJldHVybiBnZXRBamF4KHJlcXVlc3RVcmwpO1xuICAgIH1cbiAgfTtcblxuICAvKiovXG4gIGNvbnN0IHByb2Nlc3NBamF4UmVxdWVzdCA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgbGV0IHJlc3VsdCA9IEpTT04ucGFyc2UocmVzcG9uc2UpLnF1ZXJ5LnJlc3VsdHMuanNvbi5qc29uO1xuICAgICAgLy9hZGQgZmFsc2UgZmxhZyB0byBjYWxsIHByb2Nlc3NEYXRhIHdpdGggZmxhZ1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qIEV4YW1pbmVzIHJlcXVlc3QgdG8gbWFrZSBzdXJlIHdlIGdvdCBiYWNrIHZhbGlkIHJlc3BvbnNlICovXG4gIGNvbnN0IHByb2Nlc3NSZXF1ZXN0ID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBpZiAocmVzcG9uc2UudHlwZSA9PT0gJ29wYXF1ZScpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIGEgcmVzcG9uc2UsIGJ1dCBpdFxcJ3Mgb3BhcXVlIHNvIGNhblxcJ3QgZXhhbWluZSBpdCcpO1xuICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzcG9uc2UgKGkuZS4gY2FjaGUgaXQgZm9yIG9mZmxpbmUgc3VwcG9ydClcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xuICAgICAgICBjb25zb2xlLmxvZygnTG9va3MgbGlrZSB0aGVyZSB3YXMgYSBwcm9ibGVtLiBTdGF0dXMgQ29kZTogJywgcmVzcG9uc2Uuc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBFeGFtaW5lIHRoZSB0ZXh0IGluIHRoZSByZXNwb25zZVxuICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2VUZXh0KSB7XG4gICAgICAgIGxldCByZXNwb25zZSA9IHJlc3BvbnNlVGV4dC5xdWVyeS5yZXN1bHRzLmpzb24uanNvbjtcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qIFByb2Nlc3NlcyBhbmQgZmlsdGVycyBkYXRhIGludG8gY29ycmVjdCBmb3JtYXQgKi9cbiAgY29uc3QgcHJvY2Vzc0RhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgbGV0IHBvc3REYXRhID0gZGF0YVswXTtcbiAgICBsZXQgdGFnRGF0YSA9IGRhdGFbMV07XG5cbiAgICAvLyBGaWx0ZXIgZm9yIGJvb2sgcmV2aWV3cyB1c2luZyBjYXRlZ29yaWVzKCBDYXRlZ29yeSBcIjM2XCIpXG4gICAgbGV0IGZpbHRlcmVkRGF0YSA9IHBvc3REYXRhLmZpbHRlcihmdW5jdGlvbihwb3N0KSB7XG4gICAgICByZXR1cm4gcG9zdC5jYXRlZ29yaWVzID09PSAnMzYnO1xuICAgIH0pO1xuXG4gICAgbGV0IHRhZ01hcCA9IG5ldyBNYXAoKTtcbiAgICBsZXQgYWxsVGFnc0xpc3QgPSBbXTtcblxuICAgIC8vIGNyZWF0ZSBhIG1hcCB0aGF0IG1hcHMgdGFnIGlkKG51bWJlcikgd2l0aCB0YWcgbmFtZVxuICAgIHRhZ0RhdGEuZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgICAgIHRhZ01hcC5zZXQodGFnLmlkLCB0YWcubmFtZSk7XG4gICAgfSk7XG5cbiAgICAvLyBNYXAgb25seSB0aGUgcmVsZXZhbnQgcHJvcGVydGllc1xuICAgIGNvbnN0IHJldmlld0RhdGEgPSBmaWx0ZXJlZERhdGEubWFwKGZ1bmN0aW9uKHBvc3QsIGluZGV4KSB7XG4gICAgICAvLyBTaW5jZSB0aGUgY29udGVudCBvZiB0aGUgcG9zdCBpcyBpbiBodG1sIGZvcm1hdCwgd2Ugc3BsaXQgaXQgYnkgbmV3bGluZSBhbmQgb25seSB0YWtlIHRoZSBmaXJzdCBzZW50ZW5jZSBvZiB0aGUgcG9zdCBhcyBwcmV2aWV3IHRleHQgdG8gc2hvdy5cbiAgICAgIGxldCBjb250ZW50U3BsaXR0ZWQgPSBwb3N0LmNvbnRlbnQucmVuZGVyZWQuc3BsaXQoJ1xcbicpO1xuICAgICAgbGV0IHByZXZpZXcgPSBjb250ZW50U3BsaXR0ZWRbMF07XG5cbiAgICAgIGxldCB0YWdOYW1lTGlzdCA9IFtdO1xuXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgdGFncywgZ2V0dGluZyB0YWcgbmFtZSBmcm9tIGVhY2ggdGFnIGlkIHVzaW5nIHRhZ01hcC5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zdC50YWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCB0YWdOYW1lID0gdGFnTWFwLmdldChwb3N0LnRhZ3NbaV0pO1xuICAgICAgICBpZiAoQm9vbGVhbih0YWdOYW1lKSkge1xuICAgICAgICAgIHRhZ05hbWVMaXN0LnB1c2godGFnTmFtZSk7XG4gICAgICAgICAgYWxsVGFnc0xpc3QucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL3NsaWNlIG91dCB0aW1lLCBrZWVwIG9ubHkgeWVhci1tb250aC1kYXlcbiAgICAgIGxldCBmb3JtYXR0ZWREYXRlID0gcG9zdC5kYXRlLnNsaWNlKDAsMTApO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkYXRlOiBmb3JtYXR0ZWREYXRlLFxuICAgICAgICB0aXRsZTogcG9zdC50aXRsZS5yZW5kZXJlZCxcbiAgICAgICAgcHJldmlld1RleHQ6IHByZXZpZXcsXG4gICAgICAgIGZ1bGxDb250ZW50OiBwb3N0LmNvbnRlbnQucmVuZGVyZWQsXG4gICAgICAgIGltYWdlOiBwb3N0LmJldHRlcl9mZWF0dXJlZF9pbWFnZS5zb3VyY2VfdXJsLFxuICAgICAgICB0YWdzOiB0YWdOYW1lTGlzdCxcbiAgICAgICAgaW5kZXg6IGluZGV4XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgaWYgKCF3aW5kb3cuZmV0Y2gpIHtcbiAgICAgIHJldHVybiByZXZpZXdEYXRhO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICByZXZpZXdEYXRhOiByZXZpZXdEYXRhLFxuICAgICAgYWxsVGFnc0xpc3Q6IGFsbFRhZ3NMaXN0XG4gICAgfTtcbiAgfTtcblxuICAvKiBTYXZlcyBkYXRhIHRvIGxvY2FsRm9yYWdlICovXG4gIGNvbnN0IHNhdmVUb0xvY2FsRm9yYWdlID0gZnVuY3Rpb24oZGF0YU9iaikge1xuICAgIC8vIHN0b3JlIHJldmlldyBkYXRhKCdwcm9jZXNzZWREYXRhJykgYW5kIGxpc3Qgb2YgYWxsIHRhZ3MoJ2FsbFRhZ3NMaXN0JykgaW4gbG9jYWxmb3JhZ2VcbiAgICBsb2NhbGZvcmFnZS5zZXRJdGVtKCdyZXZpZXdEYXRhJywgZGF0YU9iai5yZXZpZXdEYXRhKS50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJyoqKioqcmV2aWV3RGF0YSBJTiBMT0NBTEZPUkFHRScsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBsb2NhbGZvcmFnZS5zZXRJdGVtKCd0YWdzJywgZGF0YU9iai5hbGxUYWdzTGlzdCkudGhlbigodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCcqKioqKmFsbFRhZ3NMaXN0IElOIExPQ0FMRk9SQUdFJywgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFPYmoucmV2aWV3RGF0YTtcbiAgfTtcblxuICBjb25zdCBmZXRjaEFsbERhdGEgPSBmdW5jdGlvbihmbGFnKSB7XG5cbiAgICBsZXQgcmV2aWV3RGF0YVByb21pc2U7XG4gICAgbGV0IHRhZ3NEYXRhUHJvbWlzZTtcblxuICAgIGlmIChmbGFnID09PSBmYWxzZSkge1xuICAgICAgLy8gQ2FzZSB3aGVyZSBsb2NhbGZvcmFnZS9pbmRleERCIGlzIE5PVCBzdXBwb3J0ZWQuXG4gICAgICByZXZpZXdEYXRhUHJvbWlzZSA9IGZldGNoRGF0YSgncG9zdHMnKS50aGVuKHByb2Nlc3NBamF4UmVxdWVzdCk7XG4gICAgICB0YWdzRGF0YVByb21pc2UgPSBmZXRjaERhdGEoJ3RhZ3MnKS50aGVuKHByb2Nlc3NBamF4UmVxdWVzdCk7XG4gICAgICBjb25zb2xlLmxvZygnaW0gZmV0Y2hBbGxEYXRhIGFtIGkgZ2V0dGluZyBjYWxsZWQ/IEVudGVyZWQgZmFsc2UgZmxhZycpO1xuICAgICAgLy9tYWtlIGZldGNoIHJlcXVlc3RzIGFuZCBzYXZlIHRvIGxvY2FsRm9yYWdlXG4gICAgICBQcm9taXNlLmFsbChbcmV2aWV3RGF0YVByb21pc2UsIHRhZ3NEYXRhUHJvbWlzZV0pXG4gICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgIC50aGVuKHJlbmRlcilcbiAgICAgIC50aGVuKGNoYW5nZUJvb2tDb3ZlckJhY2tncm91bmRDb2xvcilcbiAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmV0Y2hpbmcgZGF0YSBmcm9tIFdvcmRQcmVzcyBmYWlsZWQgYmVjYXVzZSBvZiA6JywgZXJyKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG5cbiAgICAgIHJldmlld0RhdGFQcm9taXNlID0gZmV0Y2hEYXRhKCdwb3N0cycpLnRoZW4ocHJvY2Vzc1JlcXVlc3QpO1xuICAgICAgdGFnc0RhdGFQcm9taXNlID0gZmV0Y2hEYXRhKCd0YWdzJykudGhlbihwcm9jZXNzUmVxdWVzdCk7XG4gICAgICBjb25zb2xlLmxvZygnRGF0YSBub3QgZm91bmQgaW4gbG9jYWxmb3JhZ2UsIGZldGNoaW5nLi4uJyk7XG5cbiAgICAgIC8vbWFrZSBmZXRjaCByZXF1ZXN0cyBhbmQgc2F2ZSB0byBsb2NhbEZvcmFnZVxuICAgICAgUHJvbWlzZS5hbGwoW3Jldmlld0RhdGFQcm9taXNlLCB0YWdzRGF0YVByb21pc2VdKVxuICAgICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgLnRoZW4oc2F2ZVRvTG9jYWxGb3JhZ2UpXG4gICAgICAgIC50aGVuKHJlbmRlcilcbiAgICAgICAgLnRoZW4oY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yKVxuICAgICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRmV0Y2hpbmcgZGF0YSBmcm9tIFdvcmRQcmVzcyBmYWlsZWQgYmVjYXVzZSBvZiA6JywgZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGluaXQgPSBmdW5jdGlvbigpIHtcblxuICAgIGxldCByZXZpZXdEYXRhRnJvbUxvY2FsID0gbG9jYWxmb3JhZ2UuZ2V0SXRlbSgncmV2aWV3RGF0YScpO1xuICAgIGxldCB0YWdEYXRhRnJvbUxvY2FsID0gbG9jYWxmb3JhZ2UuZ2V0SXRlbSgndGFncycpO1xuXG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PT0gJy8nIHx8IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PT0gJy9pbmRleC5odG1sJykge1xuICAgICAgYWRkUmVhZE1vcmVDbGlja0V2ZW50TGlzdGVuZXIoKTtcbiAgICB9XG5cbiAgICBQcm9taXNlLmFsbChbcmV2aWV3RGF0YUZyb21Mb2NhbCwgdGFnRGF0YUZyb21Mb2NhbF0pXG4gICAgICAudGhlbihmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHZhbHVlc1swXSA9PT0gbnVsbCB8fCB2YWx1ZXNbMV0gPT09IG51bGwpIHtcbiAgICAgICAgICBmZXRjaEFsbERhdGEodHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PT0gJy9hcnRpY2xlLmh0bWwnKSB7XG4gICAgICAgICAgICByZW5kZXIodmFsdWVzWzBdLCAnYXJ0aWNsZVBhZ2UnKTtcbiAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZW5kZXIodmFsdWVzWzBdLCAnbWFpbicpXG4gICAgICAgICAgICAgIC50aGVuKGNoYW5nZUJvb2tDb3ZlckJhY2tncm91bmRDb2xvcik7XG4gICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBmZXRjaEFsbERhdGEoZmFsc2UpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBmZXRjaGluZyBmcm9tIGxvY2FsZm9yYWdlIDonLCBlcnIpO1xuICAgICAgfSk7XG4gIH07XG5cbiAgLy9TdGFydCBhcHBcbiAgaW5pdCgpO1xuXG59KSgpOyJdLCJmaWxlIjoibWFpbi5qcyJ9
