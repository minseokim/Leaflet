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

  // App Logic Goes Here

  /* Configure Localforage to store data from WordPress API */
  localforage.config({
      driver: localforage.INDEXEDDB,
      name: 'Leaflet Review Data'
  });

  const addEventHandler = function() {
    const reviewSection = document.getElementById("reviews");

    reviewSection.addEventListener("click", function(e) {
      e.preventDefault();
      if (e.target.className === "readMoreButton") {
        console.log(e.target.dataset);
        localforage.setItem('currentArticleIndex', e.target.dataset.articleindex)
          .then(function(value) {
            console.log('Go to article index :', value);

            window.location.href="http://localhost:3001/article.html";
          })
      }
    })
  };

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

  const render = function(data, whichPage) {

    if (whichPage === 'main') {
      return new Promise(function(resolve) {
        console.log('rendering >>>>>>>>>>');
        console.log('rendering data : ', data);
        const templateScript = document.getElementById('review-cards').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('reviews').innerHTML = template(data);
        resolve(data);
      });
    } else {
      // article page
      const currentArticleIndex =
        localforage.getItem('currentArticleIndex').then(function(index) {
        const articleData = data[index];
        console.log('CURRENT INDEX :', index);
        console.log('articleData :', articleData);

        const templateScript = document.getElementById('article-container').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('articleContainer').innerHTML = template(articleData);
        // resolve(data);
      })
    }
  };

  const fetchData = function(type) {
    console.log('Why Am I Getting Called ?');
    const postRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/posts';
    const tagsRequestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/tags';

    let requestUrl = type === 'reviews' ? postRequestUrl : tagsRequestUrl;
    // Add 'cors' as mode since we're making a Cross-Origins Request
    return fetch(requestUrl, {mode: 'cors'});
  };

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

    return {
      processedData: processedData,
      allTagsList: allTagsList
    };
  };

  const saveToLocalForage = function(dataObj) {
    // store review data('processedData') and list of all tags('allTagsList') in localforage
    localforage.setItem('reviewData', dataObj.processedData).then((value) => {
      console.log('*****reviewData IN LOCALFORAGE', value);
    });
    localforage.setItem('tags', dataObj.allTagsList).then((value) => {
      console.log('*****allTagsList IN LOCALFORAGE', value);
    });

    return dataObj.processedData;
  };

  const init = function() {

    let reviewDataFromLocal = localforage.getItem('reviewData');
    let tagDataFromLocal = localforage.getItem('tags');

    Promise.all([reviewDataFromLocal, tagDataFromLocal])
      .then(function(values) {
        if (values[0] === null || values[1] === null) {
          fetchAllData();
        } else {
          console.log('Successfully fetched data from localforage....');

          if (window.location.pathname === '/article.html') {
            render(values[0], 'articlePage')
         } else {

            addEventHandler();
            render(values[0], 'main')
              .then(changeBookCoverBackgroundColor);
         }
        }
      }).catch(function(err) {
        console.error('Error in fetching from localforage :', err);
      })
  };

  const fetchAllData = function() {

    const reviewDataPromise = fetchData('reviews').then(processRequest);
    const tagsDataPromise = fetchData('tags').then(processRequest);
    console.log('DATA Nonexistent in localforage, fetching...');

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

  init();

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlZ2lzdHJhdGlvbik7XG4gICAgICAvLyB1cGRhdGVmb3VuZCBpcyBmaXJlZCBpZiBzZXJ2aWNlLXdvcmtlci5qcyBjaGFuZ2VzLlxuICAgICAgcmVnaXN0cmF0aW9uLm9udXBkYXRlZm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdXBkYXRlZm91bmQgaXMgYWxzbyBmaXJlZCB0aGUgdmVyeSBmaXJzdCB0aW1lIHRoZSBTVyBpcyBpbnN0YWxsZWQsXG4gICAgICAgIC8vIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcHJvbXB0IGZvciBhIHJlbG9hZCBhdCB0aGF0IHBvaW50LlxuICAgICAgICAvLyBTbyBjaGVjayBoZXJlIHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBhbHJlYWR5IGNvbnRyb2xsZWQsXG4gICAgICAgIC8vIGkuZS4gd2hldGhlciB0aGVyZSdzIGFuIGV4aXN0aW5nIHNlcnZpY2Ugd29ya2VyLlxuICAgICAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICAgIC8vIFRoZSB1cGRhdGVmb3VuZCBldmVudCBpbXBsaWVzIHRoYXQgcmVnaXN0cmF0aW9uLmluc3RhbGxpbmcgaXMgc2V0OlxuICAgICAgICAgIC8vIGh0dHBzOi8vc2xpZ2h0bHlvZmYuZ2l0aHViLmlvL1NlcnZpY2VXb3JrZXIvc3BlYy9zZXJ2aWNlX3dvcmtlci9pbmRleC5odG1sI3NlcnZpY2Utd29ya2VyLWNvbnRhaW5lci11cGRhdGVmb3VuZC1ldmVudFxuICAgICAgICAgIHZhciBpbnN0YWxsaW5nV29ya2VyID0gcmVnaXN0cmF0aW9uLmluc3RhbGxpbmc7XG5cbiAgICAgICAgICBpbnN0YWxsaW5nV29ya2VyLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoaW5zdGFsbGluZ1dvcmtlci5zdGF0ZSkge1xuICAgICAgICAgICAgICBjYXNlICdpbnN0YWxsZWQnOlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBvbGQgY29udGVudCB3aWxsIGhhdmUgYmVlbiBwdXJnZWQgYW5kIHRoZVxuICAgICAgICAgICAgICAgIC8vIGZyZXNoIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhY2hlLlxuICAgICAgICAgICAgICAgIC8vIEl0J3MgdGhlIHBlcmZlY3QgdGltZSB0byBkaXNwbGF5IGEgXCJOZXcgY29udGVudCBpc1xuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZTsgcGxlYXNlIHJlZnJlc2guXCIgbWVzc2FnZSBpbiB0aGUgcGFnZSdzIGludGVyZmFjZS5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmljZVdvcmtlciBJbnN0YWxsZWQgU3VjY2Vzc2Z1bGx5LCBOZXcgQ29udGVudCBBdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlICdyZWR1bmRhbnQnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGluc3RhbGxpbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlIHdvcmtlciBiZWNhbWUgcmVkdW5kYW50LicpO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgc2VydmljZSB3b3JrZXIgcmVnaXN0cmF0aW9uOicsIGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQXBwIExvZ2ljIEdvZXMgSGVyZVxuXG4gIC8qIENvbmZpZ3VyZSBMb2NhbGZvcmFnZSB0byBzdG9yZSBkYXRhIGZyb20gV29yZFByZXNzIEFQSSAqL1xuICBsb2NhbGZvcmFnZS5jb25maWcoe1xuICAgICAgZHJpdmVyOiBsb2NhbGZvcmFnZS5JTkRFWEVEREIsXG4gICAgICBuYW1lOiAnTGVhZmxldCBSZXZpZXcgRGF0YSdcbiAgfSk7XG5cbiAgY29uc3QgYWRkRXZlbnRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgcmV2aWV3U2VjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmV2aWV3c1wiKTtcblxuICAgIHJldmlld1NlY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmIChlLnRhcmdldC5jbGFzc05hbWUgPT09IFwicmVhZE1vcmVCdXR0b25cIikge1xuICAgICAgICBjb25zb2xlLmxvZyhlLnRhcmdldC5kYXRhc2V0KTtcbiAgICAgICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgnY3VycmVudEFydGljbGVJbmRleCcsIGUudGFyZ2V0LmRhdGFzZXQuYXJ0aWNsZWluZGV4KVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnR28gdG8gYXJ0aWNsZSBpbmRleCA6JywgdmFsdWUpO1xuXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZj1cImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS9hcnRpY2xlLmh0bWxcIjtcbiAgICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gIH07XG5cbiAgY29uc3QgY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY29uc3QgY29sb3JzID0gWycjRjM2QTZGJywgJyM2NUEzRjYnLCAnIzlGRjZCNycsICcjRkVDQzQ4J107XG4gICAgICBjb25zdCBib29rQ292ZXJFbGVtcyA9XG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXZpZXdfX2NhcmRfX2Jvb2tDb3ZlcicpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBib29rQ292ZXJFbGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgY29sb3JJbmRleCA9IGkgJSA0O1xuICAgICAgICBib29rQ292ZXJFbGVtc1tpXS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcnNbY29sb3JJbmRleF07XG4gICAgICB9XG4gICAgICByZXNvbHZlKCdVcGRhdGUgZGF0YSBpbiB0aGUgYmFja2dyb3VuZCcpO1xuICAgIH0pXG4gIH07XG5cbiAgY29uc3QgcmVuZGVyID0gZnVuY3Rpb24oZGF0YSwgd2hpY2hQYWdlKSB7XG5cbiAgICBpZiAod2hpY2hQYWdlID09PSAnbWFpbicpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcgPj4+Pj4+Pj4+PicpO1xuICAgICAgICBjb25zb2xlLmxvZygncmVuZGVyaW5nIGRhdGEgOiAnLCBkYXRhKTtcbiAgICAgICAgY29uc3QgdGVtcGxhdGVTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3LWNhcmRzJykuaW5uZXJIVE1MO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZSh0ZW1wbGF0ZVNjcmlwdCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzJykuaW5uZXJIVE1MID0gdGVtcGxhdGUoZGF0YSk7XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYXJ0aWNsZSBwYWdlXG4gICAgICBjb25zdCBjdXJyZW50QXJ0aWNsZUluZGV4ID1cbiAgICAgICAgbG9jYWxmb3JhZ2UuZ2V0SXRlbSgnY3VycmVudEFydGljbGVJbmRleCcpLnRoZW4oZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgY29uc3QgYXJ0aWNsZURhdGEgPSBkYXRhW2luZGV4XTtcbiAgICAgICAgY29uc29sZS5sb2coJ0NVUlJFTlQgSU5ERVggOicsIGluZGV4KTtcbiAgICAgICAgY29uc29sZS5sb2coJ2FydGljbGVEYXRhIDonLCBhcnRpY2xlRGF0YSk7XG5cbiAgICAgICAgY29uc3QgdGVtcGxhdGVTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXJ0aWNsZS1jb250YWluZXInKS5pbm5lckhUTUw7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FydGljbGVDb250YWluZXInKS5pbm5lckhUTUwgPSB0ZW1wbGF0ZShhcnRpY2xlRGF0YSk7XG4gICAgICAgIC8vIHJlc29sdmUoZGF0YSk7XG4gICAgICB9KVxuICAgIH1cbiAgfTtcblxuICBjb25zdCBmZXRjaERhdGEgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgY29uc29sZS5sb2coJ1doeSBBbSBJIEdldHRpbmcgQ2FsbGVkID8nKTtcbiAgICBjb25zdCBwb3N0UmVxdWVzdFVybCA9ICdodHRwOi8vbWluc2VvYWxleGtpbS5jb20vd3AtanNvbi93cC92Mi9wb3N0cyc7XG4gICAgY29uc3QgdGFnc1JlcXVlc3RVcmwgPSAnaHR0cDovL21pbnNlb2FsZXhraW0uY29tL3dwLWpzb24vd3AvdjIvdGFncyc7XG5cbiAgICBsZXQgcmVxdWVzdFVybCA9IHR5cGUgPT09ICdyZXZpZXdzJyA/IHBvc3RSZXF1ZXN0VXJsIDogdGFnc1JlcXVlc3RVcmw7XG4gICAgLy8gQWRkICdjb3JzJyBhcyBtb2RlIHNpbmNlIHdlJ3JlIG1ha2luZyBhIENyb3NzLU9yaWdpbnMgUmVxdWVzdFxuICAgIHJldHVybiBmZXRjaChyZXF1ZXN0VXJsLCB7bW9kZTogJ2NvcnMnfSk7XG4gIH07XG5cbiAgY29uc3QgcHJvY2Vzc1JlcXVlc3QgPSBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICBpZiAocmVzcG9uc2UudHlwZSA9PT0gJ29wYXF1ZScpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIGEgcmVzcG9uc2UsIGJ1dCBpdFxcJ3Mgb3BhcXVlIHNvIGNhblxcJ3QgZXhhbWluZSBpdCcpO1xuICAgICAgICAvLyBEbyBzb21ldGhpbmcgd2l0aCB0aGUgcmVzcG9uc2UgKGkuZS4gY2FjaGUgaXQgZm9yIG9mZmxpbmUgc3VwcG9ydClcbiAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgIT09IDIwMCkge1xuICAgICAgICBjb25zb2xlLmxvZygnTG9va3MgbGlrZSB0aGVyZSB3YXMgYSBwcm9ibGVtLiBTdGF0dXMgQ29kZTogJywgcmVzcG9uc2Uuc3RhdHVzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBFeGFtaW5lIHRoZSB0ZXh0IGluIHRoZSByZXNwb25zZVxuICAgICAgcmVzcG9uc2UuanNvbigpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2VUZXh0KSB7XG4gICAgICAgIHJlc29sdmUocmVzcG9uc2VUZXh0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IHByb2Nlc3NEYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIC8vIEZpbHRlciBmb3IgYm9vayByZXZpZXdzIHVzaW5nIGNhdGVnb3JpZXMoIENhdGVnb3J5IFwiMzZcIilcbiAgICBsZXQgZmlsdGVyZWREYXRhID0gZGF0YVswXS5maWx0ZXIoZnVuY3Rpb24ocG9zdCkge1xuICAgICAgcmV0dXJuIHBvc3QuY2F0ZWdvcmllc1swXSA9PT0gMzY7XG4gICAgfSk7XG5cbiAgICBsZXQgdGFnTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCBhbGxUYWdzTGlzdCA9IFtdO1xuXG4gICAgLy8gY3JlYXRlIGEgbWFwIHRoYXQgbWFwcyB0YWcgaWQobnVtYmVyKSB3aXRoIHRhZyBuYW1lXG4gICAgZGF0YVsxXS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgdGFnTWFwLnNldCh0YWcuaWQsIHRhZy5uYW1lKTtcbiAgICB9KTtcblxuICAgIC8vIE1hcCBvbmx5IHRoZSByZWxldmFudCBwcm9wZXJ0aWVzXG4gICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IGZpbHRlcmVkRGF0YS5tYXAoZnVuY3Rpb24ocG9zdCwgaW5kZXgpIHtcbiAgICAgIC8vIFNpbmNlIHRoZSBjb250ZW50IG9mIHRoZSBwb3N0IGlzIGluIGh0bWwgZm9ybWF0LCB3ZSBzcGxpdCBpdCBieSBuZXdsaW5lIGFuZCBvbmx5IHRha2UgdGhlIGZpcnN0IHNlbnRlbmNlIG9mIHRoZSBwb3N0IGFzIHByZXZpZXcgdGV4dCB0byBzaG93LlxuICAgICAgbGV0IGNvbnRlbnRTcGxpdHRlZCA9IHBvc3QuY29udGVudC5yZW5kZXJlZC5zcGxpdCgnXFxuJyk7XG4gICAgICBsZXQgcHJldmlldyA9IGNvbnRlbnRTcGxpdHRlZFswXTtcblxuICAgICAgbGV0IHRhZ05hbWVMaXN0ID0gW107XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciB0YWdzLCBnZXR0aW5nIHRhZyBuYW1lIGZyb20gZWFjaCB0YWcgaWQgdXNpbmcgdGFnTWFwLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3N0LnRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHRhZ05hbWUgPSB0YWdNYXAuZ2V0KHBvc3QudGFnc1tpXSk7XG4gICAgICAgIGlmIChCb29sZWFuKHRhZ05hbWUpKSB7XG4gICAgICAgICAgdGFnTmFtZUxpc3QucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgICBhbGxUYWdzTGlzdC5wdXNoKHRhZ05hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRhdGU6IHBvc3QuZGF0ZSxcbiAgICAgICAgdGl0bGU6IHBvc3QudGl0bGUucmVuZGVyZWQsXG4gICAgICAgIHByZXZpZXdUZXh0OiBwcmV2aWV3LFxuICAgICAgICBmdWxsQ29udGVudDogcG9zdC5jb250ZW50LnJlbmRlcmVkLFxuICAgICAgICBpbWFnZTogcG9zdC5iZXR0ZXJfZmVhdHVyZWRfaW1hZ2Uuc291cmNlX3VybCxcbiAgICAgICAgdGFnczogdGFnTmFtZUxpc3QsXG4gICAgICAgIGluZGV4OiBpbmRleFxuICAgICAgfTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBwcm9jZXNzZWREYXRhOiBwcm9jZXNzZWREYXRhLFxuICAgICAgYWxsVGFnc0xpc3Q6IGFsbFRhZ3NMaXN0XG4gICAgfTtcbiAgfTtcblxuICBjb25zdCBzYXZlVG9Mb2NhbEZvcmFnZSA9IGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAvLyBzdG9yZSByZXZpZXcgZGF0YSgncHJvY2Vzc2VkRGF0YScpIGFuZCBsaXN0IG9mIGFsbCB0YWdzKCdhbGxUYWdzTGlzdCcpIGluIGxvY2FsZm9yYWdlXG4gICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgncmV2aWV3RGF0YScsIGRhdGFPYmoucHJvY2Vzc2VkRGF0YSkudGhlbigodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCcqKioqKnJldmlld0RhdGEgSU4gTE9DQUxGT1JBR0UnLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgndGFncycsIGRhdGFPYmouYWxsVGFnc0xpc3QpLnRoZW4oKHZhbHVlKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnKioqKiphbGxUYWdzTGlzdCBJTiBMT0NBTEZPUkFHRScsIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkYXRhT2JqLnByb2Nlc3NlZERhdGE7XG4gIH07XG5cbiAgY29uc3QgaW5pdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgbGV0IHJldmlld0RhdGFGcm9tTG9jYWwgPSBsb2NhbGZvcmFnZS5nZXRJdGVtKCdyZXZpZXdEYXRhJyk7XG4gICAgbGV0IHRhZ0RhdGFGcm9tTG9jYWwgPSBsb2NhbGZvcmFnZS5nZXRJdGVtKCd0YWdzJyk7XG5cbiAgICBQcm9taXNlLmFsbChbcmV2aWV3RGF0YUZyb21Mb2NhbCwgdGFnRGF0YUZyb21Mb2NhbF0pXG4gICAgICAudGhlbihmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgICAgaWYgKHZhbHVlc1swXSA9PT0gbnVsbCB8fCB2YWx1ZXNbMV0gPT09IG51bGwpIHtcbiAgICAgICAgICBmZXRjaEFsbERhdGEoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnU3VjY2Vzc2Z1bGx5IGZldGNoZWQgZGF0YSBmcm9tIGxvY2FsZm9yYWdlLi4uLicpO1xuXG4gICAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PT0gJy9hcnRpY2xlLmh0bWwnKSB7XG4gICAgICAgICAgICByZW5kZXIodmFsdWVzWzBdLCAnYXJ0aWNsZVBhZ2UnKVxuICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgYWRkRXZlbnRIYW5kbGVyKCk7XG4gICAgICAgICAgICByZW5kZXIodmFsdWVzWzBdLCAnbWFpbicpXG4gICAgICAgICAgICAgIC50aGVuKGNoYW5nZUJvb2tDb3ZlckJhY2tncm91bmRDb2xvcik7XG4gICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbiBmZXRjaGluZyBmcm9tIGxvY2FsZm9yYWdlIDonLCBlcnIpO1xuICAgICAgfSlcbiAgfTtcblxuICBjb25zdCBmZXRjaEFsbERhdGEgPSBmdW5jdGlvbigpIHtcblxuICAgIGNvbnN0IHJldmlld0RhdGFQcm9taXNlID0gZmV0Y2hEYXRhKCdyZXZpZXdzJykudGhlbihwcm9jZXNzUmVxdWVzdCk7XG4gICAgY29uc3QgdGFnc0RhdGFQcm9taXNlID0gZmV0Y2hEYXRhKCd0YWdzJykudGhlbihwcm9jZXNzUmVxdWVzdCk7XG4gICAgY29uc29sZS5sb2coJ0RBVEEgTm9uZXhpc3RlbnQgaW4gbG9jYWxmb3JhZ2UsIGZldGNoaW5nLi4uJyk7XG5cbiAgICAvL21ha2UgZmV0Y2ggcmVxdWVzdHMgYW5kIHNhdmUgdG8gbG9jYWxGb3JhZ2VcbiAgICBQcm9taXNlLmFsbChbcmV2aWV3RGF0YVByb21pc2UsIHRhZ3NEYXRhUHJvbWlzZV0pXG4gICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgIC50aGVuKHNhdmVUb0xvY2FsRm9yYWdlKVxuICAgICAgLnRoZW4ocmVuZGVyKVxuICAgICAgLnRoZW4oY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yKVxuICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdGZXRjaGluZyBkYXRhIGZyb20gV29yZFByZXNzIGZhaWxlZCBiZWNhdXNlIG9mIDonLCBlcnIpO1xuICAgICAgfSk7XG4gIH07XG5cbiAgaW5pdCgpO1xuXG59KSgpO1xuIl0sImZpbGUiOiJtYWluLmpzIn0=
