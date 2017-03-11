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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlZ2lzdHJhdGlvbik7XG4gICAgICAvLyB1cGRhdGVmb3VuZCBpcyBmaXJlZCBpZiBzZXJ2aWNlLXdvcmtlci5qcyBjaGFuZ2VzLlxuICAgICAgcmVnaXN0cmF0aW9uLm9udXBkYXRlZm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdXBkYXRlZm91bmQgaXMgYWxzbyBmaXJlZCB0aGUgdmVyeSBmaXJzdCB0aW1lIHRoZSBTVyBpcyBpbnN0YWxsZWQsXG4gICAgICAgIC8vIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcHJvbXB0IGZvciBhIHJlbG9hZCBhdCB0aGF0IHBvaW50LlxuICAgICAgICAvLyBTbyBjaGVjayBoZXJlIHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBhbHJlYWR5IGNvbnRyb2xsZWQsXG4gICAgICAgIC8vIGkuZS4gd2hldGhlciB0aGVyZSdzIGFuIGV4aXN0aW5nIHNlcnZpY2Ugd29ya2VyLlxuICAgICAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICAgIC8vIFRoZSB1cGRhdGVmb3VuZCBldmVudCBpbXBsaWVzIHRoYXQgcmVnaXN0cmF0aW9uLmluc3RhbGxpbmcgaXMgc2V0OlxuICAgICAgICAgIC8vIGh0dHBzOi8vc2xpZ2h0bHlvZmYuZ2l0aHViLmlvL1NlcnZpY2VXb3JrZXIvc3BlYy9zZXJ2aWNlX3dvcmtlci9pbmRleC5odG1sI3NlcnZpY2Utd29ya2VyLWNvbnRhaW5lci11cGRhdGVmb3VuZC1ldmVudFxuICAgICAgICAgIHZhciBpbnN0YWxsaW5nV29ya2VyID0gcmVnaXN0cmF0aW9uLmluc3RhbGxpbmc7XG5cbiAgICAgICAgICBpbnN0YWxsaW5nV29ya2VyLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoaW5zdGFsbGluZ1dvcmtlci5zdGF0ZSkge1xuICAgICAgICAgICAgICBjYXNlICdpbnN0YWxsZWQnOlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBvbGQgY29udGVudCB3aWxsIGhhdmUgYmVlbiBwdXJnZWQgYW5kIHRoZVxuICAgICAgICAgICAgICAgIC8vIGZyZXNoIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhY2hlLlxuICAgICAgICAgICAgICAgIC8vIEl0J3MgdGhlIHBlcmZlY3QgdGltZSB0byBkaXNwbGF5IGEgXCJOZXcgY29udGVudCBpc1xuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZTsgcGxlYXNlIHJlZnJlc2guXCIgbWVzc2FnZSBpbiB0aGUgcGFnZSdzIGludGVyZmFjZS5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnU2VydmljZVdvcmtlciBJbnN0YWxsZWQgU3VjY2Vzc2Z1bGx5LCBOZXcgQ29udGVudCBBdmFpbGFibGUnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlICdyZWR1bmRhbnQnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGluc3RhbGxpbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlIHdvcmtlciBiZWNhbWUgcmVkdW5kYW50LicpO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgc2VydmljZSB3b3JrZXIgcmVnaXN0cmF0aW9uOicsIGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLyogQXBwIExvZ2ljIEdvZXMgSGVyZSAqL1xuXG4gIC8vIENvbmZpZ3VyZSBMb2NhbGZvcmFnZSB0byBzdG9yZSBkYXRhIGZyb20gV29yZFByZXNzIEFQSVxuICBsb2NhbGZvcmFnZS5jb25maWcoe1xuICAgICAgZHJpdmVyOiBsb2NhbGZvcmFnZS5JTkRFWEVEREIsXG4gICAgICBuYW1lOiAnTGVhZmxldCBSZXZpZXcgRGF0YSdcbiAgfSk7XG5cblxuICAvKiBBdHRhY2ggZXZlbnQgbGlzdGVuZXJzIHRvICdSZWFkIE1vcmUnIGJ1dHRvbiBvbiBlYWNoIGFydGljbGUgY2FyZCAqL1xuICBjb25zdCBhZGRSZWFkTW9yZUNsaWNrRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHJldmlld1NlY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJldmlld3NcIik7XG5cbiAgICByZXZpZXdTZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICAvLyBwcmV2ZW50IGFuY2hvciB0YWcgZnJvbSBzdWJtaXR0aW5nIGFuZCByZWxvYWRpbmcgcGFnZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgaWYgKGUudGFyZ2V0LmNsYXNzTmFtZSA9PT0gXCJyZWFkTW9yZUJ1dHRvblwiKSB7XG4gICAgICAgIC8vIGdldCBjdXJyZW50IGFydGljbGUgZnJvbSBkYXRhIGF0dHJpYnV0ZSwgc3RvcmUgaXQgaW4gbG9jYWxmb3JhZ2UgdGhlbiByZWRpcmVjdCB0byBhcnRpY2xlIHBhZ2VcbiAgICAgICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgnY3VycmVudEFydGljbGVJbmRleCcsIGUudGFyZ2V0LmRhdGFzZXQuYXJ0aWNsZWluZGV4KVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAvLyByZWRpcmVjdCBiYWNrIHRvIGFydGljbGUgcGFnZVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWY9IGUudGFyZ2V0LmhyZWY7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyogQ2hhbmdlIGJhY2tncm91bmQgaW1hZ2Ugb2YgYm9vayBjb3ZlciBpbWFnZSAqL1xuICBjb25zdCBjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjb25zdCBjb2xvcnMgPSBbJyNGMzZBNkYnLCAnIzY1QTNGNicsICcjOUZGNkI3JywgJyNGRUNDNDgnXTtcbiAgICAgIGNvbnN0IGJvb2tDb3ZlckVsZW1zID1cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3Jldmlld19fY2FyZF9fYm9va0NvdmVyJyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJvb2tDb3ZlckVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBjb2xvckluZGV4ID0gaSAlIDQ7XG4gICAgICAgIGJvb2tDb3ZlckVsZW1zW2ldLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGNvbG9yc1tjb2xvckluZGV4XTtcbiAgICAgIH1cbiAgICAgIHJlc29sdmUoJ1VwZGF0ZSBkYXRhIGluIHRoZSBiYWNrZ3JvdW5kJyk7XG4gICAgfSlcbiAgfTtcblxuICAvKiBSZW5kZXJzIGNvbnRlbnQgaW50byBhcnRpY2xlIHBhZ2UgYW5kIGluZGV4IHBhZ2UgdXNpbmcgSGFuZGxlYmFycyAqL1xuICBjb25zdCByZW5kZXIgPSBmdW5jdGlvbihkYXRhLCB3aGljaFBhZ2UpIHtcblxuICAgIGlmICh3aGljaFBhZ2UgPT09ICdhcnRpY2xlUGFnZScpIHtcbiAgICAgIC8vIFJlbmRlciBhcnRpY2xlIHBhZ2VcbiAgICAgIGNvbnN0IGN1cnJlbnRBcnRpY2xlSW5kZXggPVxuICAgICAgICBsb2NhbGZvcmFnZS5nZXRJdGVtKCdjdXJyZW50QXJ0aWNsZUluZGV4JykudGhlbihmdW5jdGlvbihpbmRleCkge1xuXG4gICAgICAgIC8vIElmIGFydGljbGUgaW5kZXggaXNuJ3QgZm91bmQgaW4gbG9jYWxmb3JhZ2UsIHJlZGlyZWN0IGJhY2sgdG8gaW5kZXguaHRtbFxuICAgICAgICBpZiAoIWluZGV4KSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignQXJ0aWNsZSBpbmRleCBub3QgZm91bmQgaW4gbG9jYWxmb3JhZ2UnKTtcbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZj13aW5kb3cubG9jYXRpb24ub3JpZ2luO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFydGljbGVEYXRhID0gZGF0YVtpbmRleF07XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlU2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FydGljbGUtY29udGFpbmVyJykuaW5uZXJIVE1MO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZSh0ZW1wbGF0ZVNjcmlwdCk7XG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhcnRpY2xlQ29udGFpbmVyJykuaW5uZXJIVE1MID0gdGVtcGxhdGUoYXJ0aWNsZURhdGEpO1xuICAgICAgfSk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUmVuZGVyIGluZGV4IHBhZ2VcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdyZW5kZXJpbmcgZGF0YSA6ICcsIGRhdGEpO1xuICAgICAgICBjb25zdCB0ZW1wbGF0ZVNjcmlwdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXctY2FyZHMnKS5pbm5lckhUTUw7XG4gICAgICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MnKS5pbm5lckhUTUwgPSB0ZW1wbGF0ZShkYXRhKTtcbiAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvKiBSZXR1cm5zIGZldGNoIEFQSSB0byBnZXQgZGF0YSBmcm9tIFdvcmRQcmVzcyAqL1xuICBjb25zdCBmZXRjaERhdGEgPSBmdW5jdGlvbih0eXBlKSB7XG5cbiAgICAvLyB0eXBlIGlzIGVpdGhlciAncG9zdHMnIG9yICd0YWdzJyBhbmQgd2UgZ2VuZXJhdGUgcmVxdWVzdFVybCBhY2NvcmRpbmcgdG8gd2hpY2hldmVyIG9uZSBpcyBwYXNzZWRcbiAgICBjb25zdCByZXF1ZXN0VXJsID0gYGh0dHBzOi8vcXVlcnkueWFob29hcGlzLmNvbS92MS9wdWJsaWMveXFsP3E9c2VsZWN0JTIwKiUyMGZyb20lMjBqc29uJTIwd2hlcmUlMjB1cmwlMjAlM0QlMjJodHRwJTNBJTJGJTJGd3d3Lm1pbnNlb2FsZXhraW0uY29tJTJGd3AtanNvbiUyRndwJTJGdjIlMkYke3R5cGV9JTIyJmZvcm1hdD1qc29uJmRpYWdub3N0aWNzPXRydWUmY2FsbGJhY2s9YDtcblxuICAgIC8vIEFkZCAnY29ycycgYXMgbW9kZSBzaW5jZSB3ZSdyZSBtYWtpbmcgYSBDcm9zcy1PcmlnaW5zIFJlcXVlc3RcbiAgICByZXR1cm4gZmV0Y2gocmVxdWVzdFVybCwge21vZGU6ICdjb3JzJ30pO1xuICB9O1xuXG4gIC8qIEV4YW1pbmVzIHJlcXVlc3QgdG8gbWFrZSBzdXJlIHdlIGdvdCBiYWNrIHZhbGlkIHJlc3BvbnNlICovXG4gIGNvbnN0IHByb2Nlc3NSZXF1ZXN0ID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgaWYgKHJlc3BvbnNlLnR5cGUgPT09ICdvcGFxdWUnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBhIHJlc3BvbnNlLCBidXQgaXRcXCdzIG9wYXF1ZSBzbyBjYW5cXCd0IGV4YW1pbmUgaXQnKTtcbiAgICAgICAgLy8gRG8gc29tZXRoaW5nIHdpdGggdGhlIHJlc3BvbnNlIChpLmUuIGNhY2hlIGl0IGZvciBvZmZsaW5lIHN1cHBvcnQpXG4gICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvb2tzIGxpa2UgdGhlcmUgd2FzIGEgcHJvYmxlbS4gU3RhdHVzIENvZGU6ICcsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gRXhhbWluZSB0aGUgdGV4dCBpbiB0aGUgcmVzcG9uc2VcbiAgICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlVGV4dCkge1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlVGV4dCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvKiBQcm9jZXNzZXMgYW5kIGZpbHRlcnMgZGF0YSBpbnRvIGNvcnJlY3QgZm9ybWF0ICovXG4gIGNvbnN0IHByb2Nlc3NEYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIC8vIEZpbHRlciBmb3IgYm9vayByZXZpZXdzIHVzaW5nIGNhdGVnb3JpZXMoIENhdGVnb3J5IFwiMzZcIilcbiAgICBsZXQgZmlsdGVyZWREYXRhID0gZGF0YVswXS5maWx0ZXIoZnVuY3Rpb24ocG9zdCkge1xuICAgICAgcmV0dXJuIHBvc3QuY2F0ZWdvcmllc1swXSA9PT0gMzY7XG4gICAgfSk7XG5cbiAgICBsZXQgdGFnTWFwID0gbmV3IE1hcCgpO1xuICAgIGxldCBhbGxUYWdzTGlzdCA9IFtdO1xuXG4gICAgLy8gY3JlYXRlIGEgbWFwIHRoYXQgbWFwcyB0YWcgaWQobnVtYmVyKSB3aXRoIHRhZyBuYW1lXG4gICAgZGF0YVsxXS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgdGFnTWFwLnNldCh0YWcuaWQsIHRhZy5uYW1lKTtcbiAgICB9KTtcblxuICAgIC8vIE1hcCBvbmx5IHRoZSByZWxldmFudCBwcm9wZXJ0aWVzXG4gICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IGZpbHRlcmVkRGF0YS5tYXAoZnVuY3Rpb24ocG9zdCwgaW5kZXgpIHtcbiAgICAgIC8vIFNpbmNlIHRoZSBjb250ZW50IG9mIHRoZSBwb3N0IGlzIGluIGh0bWwgZm9ybWF0LCB3ZSBzcGxpdCBpdCBieSBuZXdsaW5lIGFuZCBvbmx5IHRha2UgdGhlIGZpcnN0IHNlbnRlbmNlIG9mIHRoZSBwb3N0IGFzIHByZXZpZXcgdGV4dCB0byBzaG93LlxuICAgICAgbGV0IGNvbnRlbnRTcGxpdHRlZCA9IHBvc3QuY29udGVudC5yZW5kZXJlZC5zcGxpdCgnXFxuJyk7XG4gICAgICBsZXQgcHJldmlldyA9IGNvbnRlbnRTcGxpdHRlZFswXTtcblxuICAgICAgbGV0IHRhZ05hbWVMaXN0ID0gW107XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciB0YWdzLCBnZXR0aW5nIHRhZyBuYW1lIGZyb20gZWFjaCB0YWcgaWQgdXNpbmcgdGFnTWFwLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3N0LnRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHRhZ05hbWUgPSB0YWdNYXAuZ2V0KHBvc3QudGFnc1tpXSk7XG4gICAgICAgIGlmIChCb29sZWFuKHRhZ05hbWUpKSB7XG4gICAgICAgICAgdGFnTmFtZUxpc3QucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgICBhbGxUYWdzTGlzdC5wdXNoKHRhZ05hbWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vc2xpY2Ugb3V0IHRpbWUsIGtlZXAgb25seSB5ZWFyLW1vbnRoLWRheVxuICAgICAgbGV0IGZvcm1hdHRlZERhdGUgPSBwb3N0LmRhdGUuc2xpY2UoMCwxMCk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRhdGU6IGZvcm1hdHRlZERhdGUsXG4gICAgICAgIHRpdGxlOiBwb3N0LnRpdGxlLnJlbmRlcmVkLFxuICAgICAgICBwcmV2aWV3VGV4dDogcHJldmlldyxcbiAgICAgICAgZnVsbENvbnRlbnQ6IHBvc3QuY29udGVudC5yZW5kZXJlZCxcbiAgICAgICAgaW1hZ2U6IHBvc3QuYmV0dGVyX2ZlYXR1cmVkX2ltYWdlLnNvdXJjZV91cmwsXG4gICAgICAgIHRhZ3M6IHRhZ05hbWVMaXN0LFxuICAgICAgICBpbmRleDogaW5kZXhcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgcmV2aWV3RGF0YTogcHJvY2Vzc2VkRGF0YSxcbiAgICAgIGFsbFRhZ3NMaXN0OiBhbGxUYWdzTGlzdFxuICAgIH07XG4gIH07XG5cbiAgLyogU2F2ZXMgZGF0YSB0byBsb2NhbEZvcmFnZSAqL1xuICBjb25zdCBzYXZlVG9Mb2NhbEZvcmFnZSA9IGZ1bmN0aW9uKGRhdGFPYmopIHtcbiAgICAvLyBzdG9yZSByZXZpZXcgZGF0YSgncHJvY2Vzc2VkRGF0YScpIGFuZCBsaXN0IG9mIGFsbCB0YWdzKCdhbGxUYWdzTGlzdCcpIGluIGxvY2FsZm9yYWdlXG4gICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgncmV2aWV3RGF0YScsIGRhdGFPYmoucmV2aWV3RGF0YSkudGhlbigodmFsdWUpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCcqKioqKnJldmlld0RhdGEgSU4gTE9DQUxGT1JBR0UnLCB2YWx1ZSk7XG4gICAgfSk7XG4gICAgbG9jYWxmb3JhZ2Uuc2V0SXRlbSgndGFncycsIGRhdGFPYmouYWxsVGFnc0xpc3QpLnRoZW4oKHZhbHVlKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnKioqKiphbGxUYWdzTGlzdCBJTiBMT0NBTEZPUkFHRScsIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkYXRhT2JqLnJldmlld0RhdGE7XG4gIH07XG5cbiAgY29uc3QgZmV0Y2hBbGxEYXRhID0gZnVuY3Rpb24oKSB7XG5cbiAgICBjb25zdCByZXZpZXdEYXRhUHJvbWlzZSA9IGZldGNoRGF0YSgncG9zdHMnKS50aGVuKHByb2Nlc3NSZXF1ZXN0KTtcbiAgICBjb25zdCB0YWdzRGF0YVByb21pc2UgPSBmZXRjaERhdGEoJ3RhZ3MnKS50aGVuKHByb2Nlc3NSZXF1ZXN0KTtcblxuICAgIGNvbnNvbGUubG9nKCdEYXRhIG5vdCBmb3VuZCBpbiBsb2NhbGZvcmFnZSwgZmV0Y2hpbmcuLi4nKTtcblxuICAgIC8vbWFrZSBmZXRjaCByZXF1ZXN0cyBhbmQgc2F2ZSB0byBsb2NhbEZvcmFnZVxuICAgIFByb21pc2UuYWxsKFtyZXZpZXdEYXRhUHJvbWlzZSwgdGFnc0RhdGFQcm9taXNlXSlcbiAgICAgIC50aGVuKHByb2Nlc3NEYXRhKVxuICAgICAgLnRoZW4oc2F2ZVRvTG9jYWxGb3JhZ2UpXG4gICAgICAudGhlbihyZW5kZXIpXG4gICAgICAudGhlbihjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IpXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZldGNoaW5nIGRhdGEgZnJvbSBXb3JkUHJlc3MgZmFpbGVkIGJlY2F1c2Ugb2YgOicsIGVycik7XG4gICAgICB9KTtcbiAgfTtcblxuICBjb25zdCBpbml0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBsZXQgcmV2aWV3RGF0YUZyb21Mb2NhbCA9IGxvY2FsZm9yYWdlLmdldEl0ZW0oJ3Jldmlld0RhdGEnKTtcbiAgICBsZXQgdGFnRGF0YUZyb21Mb2NhbCA9IGxvY2FsZm9yYWdlLmdldEl0ZW0oJ3RhZ3MnKTtcblxuICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT09ICcvJyB8fCB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT09ICcvaW5kZXguaHRtbCcpIHtcbiAgICAgIGFkZFJlYWRNb3JlQ2xpY2tFdmVudExpc3RlbmVyKCk7XG4gICAgfVxuXG4gICAgUHJvbWlzZS5hbGwoW3Jldmlld0RhdGFGcm9tTG9jYWwsIHRhZ0RhdGFGcm9tTG9jYWxdKVxuICAgICAgLnRoZW4oZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXNbMF0gPT09IG51bGwgfHwgdmFsdWVzWzFdID09PSBudWxsKSB7XG4gICAgICAgICAgZmV0Y2hBbGxEYXRhKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ1N1Y2Nlc3NmdWxseSBmZXRjaGVkIGRhdGEgZnJvbSBsb2NhbGZvcmFnZS4uLi4nKTtcblxuICAgICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT09ICcvYXJ0aWNsZS5odG1sJykge1xuICAgICAgICAgICAgcmVuZGVyKHZhbHVlc1swXSwgJ2FydGljbGVQYWdlJyk7XG4gICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVuZGVyKHZhbHVlc1swXSwgJ21haW4nKVxuICAgICAgICAgICAgICAudGhlbihjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IpO1xuICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gZmV0Y2hpbmcgZnJvbSBsb2NhbGZvcmFnZSA6JywgZXJyKTtcbiAgICAgIH0pXG4gIH07XG5cbiAgLy9TdGFydCBhcHBcbiAgaW5pdCgpO1xuXG59KSgpO1xuIl0sImZpbGUiOiJtYWluLmpzIn0=
