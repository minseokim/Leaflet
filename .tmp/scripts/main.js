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
  const fetchPostData = function() {
    const requestUrl = 'http://minseoalexkim.com/wp-json/wp/v2/posts';

    return new Promise(function(resolve, reject) {
      const request = new XMLHttpRequest();
      request.open('GET', requestUrl);

      request.onload = function() {
        // if status is 200
        if (request.status === 200) {
          // resolve promise with response
          resolve(request.responseText);
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

  const processFormatData = function(rawData) {
    const processedData = rawData.map(function(post) {
      let contentSplitted = post.content.rendered.split('\n');
      let preview = contentSplitted[0] + contentSplitted[1];
      return {
        date: post.date,
        title: post.title.rendered,
        previewText: preview,
        fullContent: post.content.rendered,
        image: post.better_featured_image.source_url,
        tags: post.tags
      };
    });

    return processedData;
  };

  const render = function(reviews) {
    const templateScript = document.getElementById('review-cards').innerHTML;
    const template = Handlebars.compile(templateScript);
    document.getElementById('reviews').innerHTML = template(reviews);
  };

  const changeBookCoverBackgroundColor = function() {
    const colors = ['#F36A6F', '#65A3F6', '#9FF6B7', '#FECC48'];
    const bookCoverElems =
    document.getElementsByClassName('review__card__bookCover');
    for (let i = 0; i < bookCoverElems.length; i++) {
      let colorIndex = i % 4;
      bookCoverElems[i].style.backgroundColor = colors[colorIndex];
    }
  };

  /* fetch post data, then filter/process it, and render it */
  fetchPostData().then(function(response) {
    // Parse JSON data and then filter for book reviews using categories( Category "36")
    let postData = JSON.parse(response);
    console.log(postData);
    let filteredData = postData.filter(function(post) {
      return post.categories[0] === 36;
    });
    return filteredData;
  }, function(error) {
    console.error('Failed!', error);
  }).then(processFormatData).then(render).then(changeBookCoverBackgroundColor);
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIHVwZGF0ZWZvdW5kIGlzIGZpcmVkIGlmIHNlcnZpY2Utd29ya2VyLmpzIGNoYW5nZXMuXG4gICAgICByZWdpc3RyYXRpb24ub251cGRhdGVmb3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyB1cGRhdGVmb3VuZCBpcyBhbHNvIGZpcmVkIHRoZSB2ZXJ5IGZpcnN0IHRpbWUgdGhlIFNXIGlzIGluc3RhbGxlZCxcbiAgICAgICAgLy8gYW5kIHRoZXJlJ3Mgbm8gbmVlZCB0byBwcm9tcHQgZm9yIGEgcmVsb2FkIGF0IHRoYXQgcG9pbnQuXG4gICAgICAgIC8vIFNvIGNoZWNrIGhlcmUgdG8gc2VlIGlmIHRoZSBwYWdlIGlzIGFscmVhZHkgY29udHJvbGxlZCxcbiAgICAgICAgLy8gaS5lLiB3aGV0aGVyIHRoZXJlJ3MgYW4gZXhpc3Rpbmcgc2VydmljZSB3b3JrZXIuXG4gICAgICAgIGlmIChuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIHVwZGF0ZWZvdW5kIGV2ZW50IGltcGxpZXMgdGhhdCByZWdpc3RyYXRpb24uaW5zdGFsbGluZyBpcyBzZXQ6XG4gICAgICAgICAgLy8gaHR0cHM6Ly9zbGlnaHRseW9mZi5naXRodWIuaW8vU2VydmljZVdvcmtlci9zcGVjL3NlcnZpY2Vfd29ya2VyL2luZGV4Lmh0bWwjc2VydmljZS13b3JrZXItY29udGFpbmVyLXVwZGF0ZWZvdW5kLWV2ZW50XG4gICAgICAgICAgdmFyIGluc3RhbGxpbmdXb3JrZXIgPSByZWdpc3RyYXRpb24uaW5zdGFsbGluZztcblxuICAgICAgICAgIGluc3RhbGxpbmdXb3JrZXIub25zdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc3dpdGNoIChpbnN0YWxsaW5nV29ya2VyLnN0YXRlKSB7XG4gICAgICAgICAgICAgIGNhc2UgJ2luc3RhbGxlZCc6XG4gICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIG9sZCBjb250ZW50IHdpbGwgaGF2ZSBiZWVuIHB1cmdlZCBhbmQgdGhlXG4gICAgICAgICAgICAgICAgLy8gZnJlc2ggY29udGVudCB3aWxsIGhhdmUgYmVlbiBhZGRlZCB0byB0aGUgY2FjaGUuXG4gICAgICAgICAgICAgICAgLy8gSXQncyB0aGUgcGVyZmVjdCB0aW1lIHRvIGRpc3BsYXkgYSBcIk5ldyBjb250ZW50IGlzXG4gICAgICAgICAgICAgICAgLy8gYXZhaWxhYmxlOyBwbGVhc2UgcmVmcmVzaC5cIiBtZXNzYWdlIGluIHRoZSBwYWdlJ3MgaW50ZXJmYWNlLlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNhc2UgJ3JlZHVuZGFudCc6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgaW5zdGFsbGluZyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3NlcnZpY2Ugd29ya2VyIGJlY2FtZSByZWR1bmRhbnQuJyk7XG5cbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGR1cmluZyBzZXJ2aWNlIHdvcmtlciByZWdpc3RyYXRpb246JywgZSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBDdXN0b20gSlMgR29lcyBIZXJlXG4gIGNvbnN0IGZldGNoUG9zdERhdGEgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zdCByZXF1ZXN0VXJsID0gJ2h0dHA6Ly9taW5zZW9hbGV4a2ltLmNvbS93cC1qc29uL3dwL3YyL3Bvc3RzJztcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgcmVxdWVzdFVybCk7XG5cbiAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGlmIHN0YXR1cyBpcyAyMDBcbiAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAvLyByZXNvbHZlIHByb21pc2Ugd2l0aCByZXNwb25zZVxuICAgICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG90aGVyd2lzZSByZWplY3Qgd2l0aCBzdGF0dXMgdGV4dFxuICAgICAgICAgIHJlamVjdChFcnJvcihyZXF1ZXN0LnN0YXR1c1RleHQpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIC8vIEhhbmRsaW5nIG5ldHdvcmsgZXJyb3JzXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIEVycm9yIScpKTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IHByb2Nlc3NGb3JtYXREYXRhID0gZnVuY3Rpb24ocmF3RGF0YSkge1xuICAgIGNvbnN0IHByb2Nlc3NlZERhdGEgPSByYXdEYXRhLm1hcChmdW5jdGlvbihwb3N0KSB7XG4gICAgICBsZXQgY29udGVudFNwbGl0dGVkID0gcG9zdC5jb250ZW50LnJlbmRlcmVkLnNwbGl0KCdcXG4nKTtcbiAgICAgIGxldCBwcmV2aWV3ID0gY29udGVudFNwbGl0dGVkWzBdICsgY29udGVudFNwbGl0dGVkWzFdO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGF0ZTogcG9zdC5kYXRlLFxuICAgICAgICB0aXRsZTogcG9zdC50aXRsZS5yZW5kZXJlZCxcbiAgICAgICAgcHJldmlld1RleHQ6IHByZXZpZXcsXG4gICAgICAgIGZ1bGxDb250ZW50OiBwb3N0LmNvbnRlbnQucmVuZGVyZWQsXG4gICAgICAgIGltYWdlOiBwb3N0LmJldHRlcl9mZWF0dXJlZF9pbWFnZS5zb3VyY2VfdXJsLFxuICAgICAgICB0YWdzOiBwb3N0LnRhZ3NcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcHJvY2Vzc2VkRGF0YTtcbiAgfTtcblxuICBjb25zdCByZW5kZXIgPSBmdW5jdGlvbihyZXZpZXdzKSB7XG4gICAgY29uc3QgdGVtcGxhdGVTY3JpcHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3LWNhcmRzJykuaW5uZXJIVE1MO1xuICAgIGNvbnN0IHRlbXBsYXRlID0gSGFuZGxlYmFycy5jb21waWxlKHRlbXBsYXRlU2NyaXB0KTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cycpLmlubmVySFRNTCA9IHRlbXBsYXRlKHJldmlld3MpO1xuICB9O1xuXG4gIGNvbnN0IGNoYW5nZUJvb2tDb3ZlckJhY2tncm91bmRDb2xvciA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGNvbG9ycyA9IFsnI0YzNkE2RicsICcjNjVBM0Y2JywgJyM5RkY2QjcnLCAnI0ZFQ0M0OCddO1xuICAgIGNvbnN0IGJvb2tDb3ZlckVsZW1zID1cbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdyZXZpZXdfX2NhcmRfX2Jvb2tDb3ZlcicpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYm9va0NvdmVyRWxlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBjb2xvckluZGV4ID0gaSAlIDQ7XG4gICAgICBib29rQ292ZXJFbGVtc1tpXS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBjb2xvcnNbY29sb3JJbmRleF07XG4gICAgfVxuICB9O1xuXG4gIC8qIGZldGNoIHBvc3QgZGF0YSwgdGhlbiBmaWx0ZXIvcHJvY2VzcyBpdCwgYW5kIHJlbmRlciBpdCAqL1xuICBmZXRjaFBvc3REYXRhKCkudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIC8vIFBhcnNlIEpTT04gZGF0YSBhbmQgdGhlbiBmaWx0ZXIgZm9yIGJvb2sgcmV2aWV3cyB1c2luZyBjYXRlZ29yaWVzKCBDYXRlZ29yeSBcIjM2XCIpXG4gICAgbGV0IHBvc3REYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgY29uc29sZS5sb2cocG9zdERhdGEpO1xuICAgIGxldCBmaWx0ZXJlZERhdGEgPSBwb3N0RGF0YS5maWx0ZXIoZnVuY3Rpb24ocG9zdCkge1xuICAgICAgcmV0dXJuIHBvc3QuY2F0ZWdvcmllc1swXSA9PT0gMzY7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZpbHRlcmVkRGF0YTtcbiAgfSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQhJywgZXJyb3IpO1xuICB9KS50aGVuKHByb2Nlc3NGb3JtYXREYXRhKS50aGVuKHJlbmRlcikudGhlbihjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IpO1xufSkoKTtcbiJdLCJmaWxlIjoibWFpbi5qcyJ9
