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

  const addReadMoreClickEventListener = function() {
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

    if (whichPage === 'articlePage') {
      // Render article page
      const currentArticleIndex =
        localforage.getItem('currentArticleIndex').then(function(index) {

        // To-Do : Handle error where current article index isn't found from localforage
        if (!index) {
          alert('nothing found here!');
          return;
        }

        const articleData = data[index];
        const templateScript = document.getElementById('article-container').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('articleContainer').innerHTML = template(articleData);
      });

    } else {
      // Render on index page
      return new Promise(function(resolve) {
        console.log('rendering data : ', data);
        const templateScript = document.getElementById('review-cards').innerHTML;
        const template = Handlebars.compile(templateScript);
        document.getElementById('reviews').innerHTML = template(data);
        resolve(data);
      });
    }
  };

  const fetchData = function(type) {
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
            addReadMoreClickEventListener();
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

  init();

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlZ2lzdHJhdGlvbik7XG4gICAgICAvLyB1cGRhdGVmb3VuZCBpcyBmaXJlZCBpZiBzZXJ2aWNlLXdvcmtlci5qcyBjaGFuZ2VzLlxuICAgICAgcmVnaXN0cmF0aW9uLm9udXBkYXRlZm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdXBkYXRlZm91bmQgaXMgYWxzbyBmaXJlZCB0aGUgdmVyeSBmaXJzdCB0aW1lIHRoZSBTVyBpcyBpbnN0YWxsZWQsXG4gICAgICAgIC8vIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcHJvbXB0IGZvciBhIHJlbG9hZCBhdCB0aGF0IHBvaW50LlxuICAgICAgICAvLyBTbyBjaGVjayBoZXJlIHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBhbHJlYWR5IGNvbnRyb2xsZWQsXG4gICAgICAgIC8vIGkuZS4gd2hldGhlciB0aGVyZSdzIGFuIGV4aXN0aW5nIHNlcnZpY2Ugd29ya2VyLlxuICAgICAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICAgIC8vIFRoZSB1cGRhdGVmb3VuZCBldmVudCBpbXBsaWVzIHRoYXQgcmVnaXN0cmF0aW9uLmluc3RhbGxpbmcgaXMgc2V0OlxuICAgICAgICAgIC8vIGh0dHBzOi8vc2xpZ2h0bHlvZmYuZ2l0aHViLmlvL1NlcnZpY2VXb3JrZXIvc3BlYy9zZXJ2aWNlX3dvcmtlci9pbmRleC5odG1sI3NlcnZpY2Utd29ya2VyLWNvbnRhaW5lci11cGRhdGVmb3VuZC1ldmVudFxuICAgICAgICAgIHZhciBpbnN0YWxsaW5nV29ya2VyID0gcmVnaXN0cmF0aW9uLmluc3RhbGxpbmc7XG5cbiAgICAgICAgICBpbnN0YWxsaW5nV29ya2VyLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoaW5zdGFsbGluZ1dvcmtlci5zdGF0ZSkge1xuICAgICAgICAgICAgICBjYXNlICdpbnN0YWxsZWQnOlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBvbGQgY29udGVudCB3aWxsIGhhdmUgYmVlbiBwdXJnZWQgYW5kIHRoZVxuICAgICAgICAgICAgICAgIC8vIGZyZXNoIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhY2hlLlxuICAgICAgICAgICAgICAgIC8vIEl0J3MgdGhlIHBlcmZlY3QgdGltZSB0byBkaXNwbGF5IGEgXCJOZXcgY29udGVudCBpc1xuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZTsgcGxlYXNlIHJlZnJlc2guXCIgbWVzc2FnZSBpbiB0aGUgcGFnZSdzIGludGVyZmFjZS5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmljZVdvcmtlciBJbnN0YWxsZWQgU3VjY2Vzc2Z1bGx5LCBOZXcgQ29udGVudCBBdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlICdyZWR1bmRhbnQnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGluc3RhbGxpbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlIHdvcmtlciBiZWNhbWUgcmVkdW5kYW50LicpO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgc2VydmljZSB3b3JrZXIgcmVnaXN0cmF0aW9uOicsIGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQXBwIExvZ2ljIEdvZXMgSGVyZVxuXG4gIC8qIENvbmZpZ3VyZSBMb2NhbGZvcmFnZSB0byBzdG9yZSBkYXRhIGZyb20gV29yZFByZXNzIEFQSSAqL1xuICBsb2NhbGZvcmFnZS5jb25maWcoe1xuICAgICAgZHJpdmVyOiBsb2NhbGZvcmFnZS5JTkRFWEVEREIsXG4gICAgICBuYW1lOiAnTGVhZmxldCBSZXZpZXcgRGF0YSdcbiAgfSk7XG5cbiAgY29uc3QgYWRkUmVhZE1vcmVDbGlja0V2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zdCByZXZpZXdTZWN0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXZpZXdzXCIpO1xuXG4gICAgcmV2aWV3U2VjdGlvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGUudGFyZ2V0LmNsYXNzTmFtZSA9PT0gXCJyZWFkTW9yZUJ1dHRvblwiKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUudGFyZ2V0LmRhdGFzZXQpO1xuICAgICAgICBsb2NhbGZvcmFnZS5zZXRJdGVtKCdjdXJyZW50QXJ0aWNsZUluZGV4JywgZS50YXJnZXQuZGF0YXNldC5hcnRpY2xlaW5kZXgpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdHbyB0byBhcnRpY2xlIGluZGV4IDonLCB2YWx1ZSk7XG5cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmPVwiaHR0cDovL2xvY2FsaG9zdDozMDAxL2FydGljbGUuaHRtbFwiO1xuICAgICAgICAgIH0pXG4gICAgICB9XG4gICAgfSlcbiAgfTtcblxuICBjb25zdCBjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjb25zdCBjb2xvcnMgPSBbJyNGMzZBNkYnLCAnIzY1QTNGNicsICcjOUZGNkI3JywgJyNGRUNDNDgnXTtcbiAgICAgIGNvbnN0IGJvb2tDb3ZlckVsZW1zID1cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3Jldmlld19fY2FyZF9fYm9va0NvdmVyJyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJvb2tDb3ZlckVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBjb2xvckluZGV4ID0gaSAlIDQ7XG4gICAgICAgIGJvb2tDb3ZlckVsZW1zW2ldLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yc1tjb2xvckluZGV4XTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoJ1VwZGF0ZSBkYXRhIGluIHRoZSBiYWNrZ3JvdW5kJyk7XG4gICAgfSlcbiAgfTtcblxuICBjb25zdCByZW5kZXIgPSBmdW5jdGlvbihkYXRhLCB3aGljaFBhZ2UpIHtcblxuICAgIGlmICh3aGljaFBhZ2UgPT09ICdhcnRpY2xlUGFnZScpIHtcbiAgICAgIC8vIFJlbmRlciBhcnRpY2xlIHBhZ2VcbiAgICAgIGNvbnN0IGN1cnJlbnRBcnRpY2xlSW5kZXggPVxuICAgICAgICBsb2NhbGZvcmFnZS5nZXRJdGVtKCdjdXJyZW50QXJ0aWNsZUluZGV4JykudGhlbihmdW5jdGlvbihpbmRleCkge1xuXG4gICAgICAgIC8vIFRvLURvIDogSGFuZGxlIGVycm9yIHdoZXJlIGN1cnJlbnQgYXJ0aWNsZSBpbmRleCBpc24ndCBmb3VuZCBmcm9tIGxvY2FsZm9yYWdlXG4gICAgICAgIGlmICghaW5kZXgpIHtcbiAgICAgICAgICBhbGVydCgnbm90aGluZyBmb3VuZCBoZXJlIScpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFydGljbGVEYXRhID0gZGF0YVtpbmRleF07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlU2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FydGljbGUtY29udGFpbmVyJykuaW5uZXJIVE1MO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZSh0ZW1wbGF0ZVNjcmlwdCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcnRpY2xlQ29udGFpbmVyJykuaW5uZXJIVE1MID0gdGVtcGxhdGUoYXJ0aWNsZURhdGEpO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUmVuZGVyIG9uIGluZGV4IHBhZ2VcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcgZGF0YSA6ICcsIGRhdGEpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVNjcmlwdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXctY2FyZHMnKS5pbm5lckhUTUw7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MnKS5pbm5lckhUTUwgPSB0ZW1wbGF0ZShkYXRhKTtcbiAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBmZXRjaERhdGEgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgY29uc3QgcG9zdFJlcXVlc3RVcmwgPSAnaHR0cDovL21pbnNlb2FsZXhraW0uY29tL3dwLWpzb24vd3AvdjIvcG9zdHMnO1xuICAgIGNvbnN0IHRhZ3NSZXF1ZXN0VXJsID0gJ2h0dHA6Ly9taW5zZW9hbGV4a2ltLmNvbS93cC1qc29uL3dwL3YyL3RhZ3MnO1xuXG4gICAgbGV0IHJlcXVlc3RVcmwgPSB0eXBlID09PSAncmV2aWV3cycgPyBwb3N0UmVxdWVzdFVybCA6IHRhZ3NSZXF1ZXN0VXJsO1xuICAgIC8vIEFkZCAnY29ycycgYXMgbW9kZSBzaW5jZSB3ZSdyZSBtYWtpbmcgYSBDcm9zcy1PcmlnaW5zIFJlcXVlc3RcbiAgICByZXR1cm4gZmV0Y2gocmVxdWVzdFVybCwge21vZGU6ICdjb3JzJ30pO1xuICB9O1xuXG4gIGNvbnN0IHByb2Nlc3NSZXF1ZXN0ID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT09ICdvcGFxdWUnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBhIHJlc3BvbnNlLCBidXQgaXRcXCdzIG9wYXF1ZSBzbyBjYW5cXCd0IGV4YW1pbmUgaXQnKTtcbiAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3BvbnNlIChpLmUuIGNhY2hlIGl0IGZvciBvZmZsaW5lIHN1cHBvcnQpXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvb2tzIGxpa2UgdGhlcmUgd2FzIGEgcHJvYmxlbS4gU3RhdHVzIENvZGU6ICcsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRXhhbWluZSB0aGUgdGV4dCBpbiB0aGUgcmVzcG9uc2VcbiAgICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlVGV4dCkge1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlVGV4dCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBwcm9jZXNzRGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAvLyBGaWx0ZXIgZm9yIGJvb2sgcmV2aWV3cyB1c2luZyBjYXRlZ29yaWVzKCBDYXRlZ29yeSBcIjM2XCIpXG4gICAgbGV0IGZpbHRlcmVkRGF0YSA9IGRhdGFbMF0uZmlsdGVyKGZ1bmN0aW9uKHBvc3QpIHtcbiAgICAgIHJldHVybiBwb3N0LmNhdGVnb3JpZXNbMF0gPT09IDM2O1xuICAgIH0pO1xuXG4gICAgbGV0IHRhZ01hcCA9IG5ldyBNYXAoKTtcbiAgICBsZXQgYWxsVGFnc0xpc3QgPSBbXTtcblxuICAgIC8vIGNyZWF0ZSBhIG1hcCB0aGF0IG1hcHMgdGFnIGlkKG51bWJlcikgd2l0aCB0YWcgbmFtZVxuICAgIGRhdGFbMV0uZm9yRWFjaChmdW5jdGlvbih0YWcpIHtcbiAgICAgIHRhZ01hcC5zZXQodGFnLmlkLCB0YWcubmFtZSk7XG4gICAgfSk7XG5cbiAgICAvLyBNYXAgb25seSB0aGUgcmVsZXZhbnQgcHJvcGVydGllc1xuICAgIGNvbnN0IHByb2Nlc3NlZERhdGEgPSBmaWx0ZXJlZERhdGEubWFwKGZ1bmN0aW9uKHBvc3QsIGluZGV4KSB7XG4gICAgICAvLyBTaW5jZSB0aGUgY29udGVudCBvZiB0aGUgcG9zdCBpcyBpbiBodG1sIGZvcm1hdCwgd2Ugc3BsaXQgaXQgYnkgbmV3bGluZSBhbmQgb25seSB0YWtlIHRoZSBmaXJzdCBzZW50ZW5jZSBvZiB0aGUgcG9zdCBhcyBwcmV2aWV3IHRleHQgdG8gc2hvdy5cbiAgICAgIGxldCBjb250ZW50U3BsaXR0ZWQgPSBwb3N0LmNvbnRlbnQucmVuZGVyZWQuc3BsaXQoJ1xcbicpO1xuICAgICAgbGV0IHByZXZpZXcgPSBjb250ZW50U3BsaXR0ZWRbMF07XG5cbiAgICAgIGxldCB0YWdOYW1lTGlzdCA9IFtdO1xuXG4gICAgICAvLyBJdGVyYXRlIG92ZXIgdGFncywgZ2V0dGluZyB0YWcgbmFtZSBmcm9tIGVhY2ggdGFnIGlkIHVzaW5nIHRhZ01hcC5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zdC50YWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCB0YWdOYW1lID0gdGFnTWFwLmdldChwb3N0LnRhZ3NbaV0pO1xuICAgICAgICBpZiAoQm9vbGVhbih0YWdOYW1lKSkge1xuICAgICAgICAgIHRhZ05hbWVMaXN0LnB1c2godGFnTmFtZSk7XG4gICAgICAgICAgYWxsVGFnc0xpc3QucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvL3NsaWNlIG91dCB0aW1lLCBrZWVwIG9ubHkgeWVhci1tb250aC1kYXlcbiAgICAgIGxldCBmb3JtYXR0ZWREYXRlID0gcG9zdC5kYXRlLnNsaWNlKDAsMTApO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkYXRlOiBmb3JtYXR0ZWREYXRlLFxuICAgICAgICB0aXRsZTogcG9zdC50aXRsZS5yZW5kZXJlZCxcbiAgICAgICAgcHJldmlld1RleHQ6IHByZXZpZXcsXG4gICAgICAgIGZ1bGxDb250ZW50OiBwb3N0LmNvbnRlbnQucmVuZGVyZWQsXG4gICAgICAgIGltYWdlOiBwb3N0LmJldHRlcl9mZWF0dXJlZF9pbWFnZS5zb3VyY2VfdXJsLFxuICAgICAgICB0YWdzOiB0YWdOYW1lTGlzdCxcbiAgICAgICAgaW5kZXg6IGluZGV4XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2Nlc3NlZERhdGE6IHByb2Nlc3NlZERhdGEsXG4gICAgICBhbGxUYWdzTGlzdDogYWxsVGFnc0xpc3RcbiAgICB9O1xuICB9O1xuXG4gIGNvbnN0IHNhdmVUb0xvY2FsRm9yYWdlID0gZnVuY3Rpb24oZGF0YU9iaikge1xuICAgIC8vIHN0b3JlIHJldmlldyBkYXRhKCdwcm9jZXNzZWREYXRhJykgYW5kIGxpc3Qgb2YgYWxsIHRhZ3MoJ2FsbFRhZ3NMaXN0JykgaW4gbG9jYWxmb3JhZ2VcbiAgICBsb2NhbGZvcmFnZS5zZXRJdGVtKCdyZXZpZXdEYXRhJywgZGF0YU9iai5wcm9jZXNzZWREYXRhKS50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJyoqKioqcmV2aWV3RGF0YSBJTiBMT0NBTEZPUkFHRScsIHZhbHVlKTtcbiAgICB9KTtcbiAgICBsb2NhbGZvcmFnZS5zZXRJdGVtKCd0YWdzJywgZGF0YU9iai5hbGxUYWdzTGlzdCkudGhlbigodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCcqKioqKmFsbFRhZ3NMaXN0IElOIExPQ0FMRk9SQUdFJywgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRhdGFPYmoucHJvY2Vzc2VkRGF0YTtcbiAgfTtcblxuICBjb25zdCBpbml0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBsZXQgcmV2aWV3RGF0YUZyb21Mb2NhbCA9IGxvY2FsZm9yYWdlLmdldEl0ZW0oJ3Jldmlld0RhdGEnKTtcbiAgICBsZXQgdGFnRGF0YUZyb21Mb2NhbCA9IGxvY2FsZm9yYWdlLmdldEl0ZW0oJ3RhZ3MnKTtcblxuICAgIFByb21pc2UuYWxsKFtyZXZpZXdEYXRhRnJvbUxvY2FsLCB0YWdEYXRhRnJvbUxvY2FsXSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgICBpZiAodmFsdWVzWzBdID09PSBudWxsIHx8IHZhbHVlc1sxXSA9PT0gbnVsbCkge1xuICAgICAgICAgIGZldGNoQWxsRGF0YSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdTdWNjZXNzZnVsbHkgZmV0Y2hlZCBkYXRhIGZyb20gbG9jYWxmb3JhZ2UuLi4uJyk7XG5cbiAgICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID09PSAnL2FydGljbGUuaHRtbCcpIHtcbiAgICAgICAgICAgIHJlbmRlcih2YWx1ZXNbMF0sICdhcnRpY2xlUGFnZScpXG4gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkUmVhZE1vcmVDbGlja0V2ZW50TGlzdGVuZXIoKTtcbiAgICAgICAgICAgIHJlbmRlcih2YWx1ZXNbMF0sICdtYWluJylcbiAgICAgICAgICAgICAgLnRoZW4oY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yKTtcbiAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGZldGNoaW5nIGZyb20gbG9jYWxmb3JhZ2UgOicsIGVycik7XG4gICAgICB9KVxuICB9O1xuXG4gIGNvbnN0IGZldGNoQWxsRGF0YSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgY29uc3QgcmV2aWV3RGF0YVByb21pc2UgPSBmZXRjaERhdGEoJ3Jldmlld3MnKS50aGVuKHByb2Nlc3NSZXF1ZXN0KTtcbiAgICBjb25zdCB0YWdzRGF0YVByb21pc2UgPSBmZXRjaERhdGEoJ3RhZ3MnKS50aGVuKHByb2Nlc3NSZXF1ZXN0KTtcblxuICAgIGNvbnNvbGUubG9nKCdEYXRhIG5vdCBmb3VuZCBpbiBsb2NhbGZvcmFnZSwgZmV0Y2hpbmcuLi4nKTtcblxuICAgIC8vbWFrZSBmZXRjaCByZXF1ZXN0cyBhbmQgc2F2ZSB0byBsb2NhbEZvcmFnZVxuICAgIFByb21pc2UuYWxsKFtyZXZpZXdEYXRhUHJvbWlzZSwgdGFnc0RhdGFQcm9taXNlXSlcbiAgICAgIC50aGVuKHByb2Nlc3NEYXRhKVxuICAgICAgLnRoZW4oc2F2ZVRvTG9jYWxGb3JhZ2UpXG4gICAgICAudGhlbihyZW5kZXIpXG4gICAgICAudGhlbihjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZldGNoaW5nIGRhdGEgZnJvbSBXb3JkUHJlc3MgZmFpbGVkIGJlY2F1c2Ugb2YgOicsIGVycik7XG4gICAgICB9KTtcbiAgfTtcblxuICBpbml0KCk7XG5cbn0pKCk7XG4iXSwiZmlsZSI6Im1haW4uanMifQ==
