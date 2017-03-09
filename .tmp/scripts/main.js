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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1lbnYgYnJvd3NlciAqL1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gQ2hlY2sgdG8gbWFrZSBzdXJlIHNlcnZpY2Ugd29ya2VycyBhcmUgc3VwcG9ydGVkIGluIHRoZSBjdXJyZW50IGJyb3dzZXIsXG4gIC8vIGFuZCB0aGF0IHRoZSBjdXJyZW50IHBhZ2UgaXMgYWNjZXNzZWQgZnJvbSBhIHNlY3VyZSBvcmlnaW4uIFVzaW5nIGFcbiAgLy8gc2VydmljZSB3b3JrZXIgZnJvbSBhbiBpbnNlY3VyZSBvcmlnaW4gd2lsbCB0cmlnZ2VyIEpTIGNvbnNvbGUgZXJyb3JzLiBTZWVcbiAgLy8gaHR0cDovL3d3dy5jaHJvbWl1bS5vcmcvSG9tZS9jaHJvbWl1bS1zZWN1cml0eS9wcmVmZXItc2VjdXJlLW9yaWdpbnMtZm9yLXBvd2VyZnVsLW5ldy1mZWF0dXJlc1xuICB2YXIgaXNMb2NhbGhvc3QgPSBCb29sZWFuKHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcgfHxcbiAgICAgIC8vIFs6OjFdIGlzIHRoZSBJUHY2IGxvY2FsaG9zdCBhZGRyZXNzLlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnWzo6MV0nIHx8XG4gICAgICAvLyAxMjcuMC4wLjEvOCBpcyBjb25zaWRlcmVkIGxvY2FsaG9zdCBmb3IgSVB2NC5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZS5tYXRjaChcbiAgICAgICAgL14xMjcoPzpcXC4oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pKXszfSQvXG4gICAgICApXG4gICAgKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJlxuICAgICAgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgfHwgaXNMb2NhbGhvc3QpKSB7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVnaXN0ZXIoJ3NlcnZpY2Utd29ya2VyLmpzJylcbiAgICAudGhlbihmdW5jdGlvbihyZWdpc3RyYXRpb24pIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHJlZ2lzdHJhdGlvbik7XG4gICAgICAvLyB1cGRhdGVmb3VuZCBpcyBmaXJlZCBpZiBzZXJ2aWNlLXdvcmtlci5qcyBjaGFuZ2VzLlxuICAgICAgcmVnaXN0cmF0aW9uLm9udXBkYXRlZm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gdXBkYXRlZm91bmQgaXMgYWxzbyBmaXJlZCB0aGUgdmVyeSBmaXJzdCB0aW1lIHRoZSBTVyBpcyBpbnN0YWxsZWQsXG4gICAgICAgIC8vIGFuZCB0aGVyZSdzIG5vIG5lZWQgdG8gcHJvbXB0IGZvciBhIHJlbG9hZCBhdCB0aGF0IHBvaW50LlxuICAgICAgICAvLyBTbyBjaGVjayBoZXJlIHRvIHNlZSBpZiB0aGUgcGFnZSBpcyBhbHJlYWR5IGNvbnRyb2xsZWQsXG4gICAgICAgIC8vIGkuZS4gd2hldGhlciB0aGVyZSdzIGFuIGV4aXN0aW5nIHNlcnZpY2Ugd29ya2VyLlxuICAgICAgICBpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuICAgICAgICAgIC8vIFRoZSB1cGRhdGVmb3VuZCBldmVudCBpbXBsaWVzIHRoYXQgcmVnaXN0cmF0aW9uLmluc3RhbGxpbmcgaXMgc2V0OlxuICAgICAgICAgIC8vIGh0dHBzOi8vc2xpZ2h0bHlvZmYuZ2l0aHViLmlvL1NlcnZpY2VXb3JrZXIvc3BlYy9zZXJ2aWNlX3dvcmtlci9pbmRleC5odG1sI3NlcnZpY2Utd29ya2VyLWNvbnRhaW5lci11cGRhdGVmb3VuZC1ldmVudFxuICAgICAgICAgIHZhciBpbnN0YWxsaW5nV29ya2VyID0gcmVnaXN0cmF0aW9uLmluc3RhbGxpbmc7XG5cbiAgICAgICAgICBpbnN0YWxsaW5nV29ya2VyLm9uc3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoaW5zdGFsbGluZ1dvcmtlci5zdGF0ZSkge1xuICAgICAgICAgICAgICBjYXNlICdpbnN0YWxsZWQnOlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBvbGQgY29udGVudCB3aWxsIGhhdmUgYmVlbiBwdXJnZWQgYW5kIHRoZVxuICAgICAgICAgICAgICAgIC8vIGZyZXNoIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gYWRkZWQgdG8gdGhlIGNhY2hlLlxuICAgICAgICAgICAgICAgIC8vIEl0J3MgdGhlIHBlcmZlY3QgdGltZSB0byBkaXNwbGF5IGEgXCJOZXcgY29udGVudCBpc1xuICAgICAgICAgICAgICAgIC8vIGF2YWlsYWJsZTsgcGxlYXNlIHJlZnJlc2guXCIgbWVzc2FnZSBpbiB0aGUgcGFnZSdzIGludGVyZmFjZS5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjYXNlICdyZWR1bmRhbnQnOlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGluc3RhbGxpbmcgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlIHdvcmtlciBiZWNhbWUgcmVkdW5kYW50LicpO1xuXG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSWdub3JlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgc2VydmljZSB3b3JrZXIgcmVnaXN0cmF0aW9uOicsIGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gQ3VzdG9tIEpTIEdvZXMgSGVyZVxuICBjb25zdCBjaGFuZ2VCb29rQ292ZXJCYWNrZ3JvdW5kQ29sb3IgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBjb2xvcnMgPSBbJyNGMzZBNkYnLCAnIzY1QTNGNicsICcjOUZGNkI3JywgJyNGRUNDNDgnXTtcbiAgICBjb25zdCBib29rQ292ZXJFbGVtcyA9XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgncmV2aWV3X19jYXJkX19ib29rQ292ZXInKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJvb2tDb3ZlckVsZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgY29sb3JJbmRleCA9IGkgJSA0O1xuICAgICAgYm9va0NvdmVyRWxlbXNbaV0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gY29sb3JzW2NvbG9ySW5kZXhdO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCByZW5kZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLUlOU0lERSBSRU5ERVIgRlVOQ1RJT04tLS0tLS0tLScpO1xuICAgIGNvbnN0IHRlbXBsYXRlU2NyaXB0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlldy1jYXJkcycpLmlubmVySFRNTDtcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuY29tcGlsZSh0ZW1wbGF0ZVNjcmlwdCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MnKS5pbm5lckhUTUwgPSB0ZW1wbGF0ZShkYXRhKTtcbiAgfTtcblxuICBjb25zdCBmZXRjaERhdGEgPSBmdW5jdGlvbih0eXBlKSB7XG4gICAgY29uc3QgcG9zdFJlcXVlc3RVcmwgPSAnaHR0cDovL21pbnNlb2FsZXhraW0uY29tL3dwLWpzb24vd3AvdjIvcG9zdHMnO1xuICAgIGNvbnN0IHRhZ3NSZXF1ZXN0VXJsID0gJ2h0dHA6Ly9taW5zZW9hbGV4a2ltLmNvbS93cC1qc29uL3dwL3YyL3RhZ3MnO1xuXG4gICAgbGV0IHJlcXVlc3RVcmwgPSB0eXBlID09PSAncmV2aWV3cycgPyBwb3N0UmVxdWVzdFVybCA6IHRhZ3NSZXF1ZXN0VXJsO1xuICAgIHJldHVybiBmZXRjaChyZXF1ZXN0VXJsLCB7J21vZGUnOiAnY29ycyd9KTtcbiAgfTtcblxuICBjb25zdCBwcm9jZXNzUmVxdWVzdCA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgLy8gY29uc29sZS5sb2coJ3Jlc3BvbnNlIGZyb20gQ0FDSEUgOi0tLS0tLS0tPj4+Pj4+Pj4+JywgcmVzcG9uc2UpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlmIChyZXNwb25zZS50eXBlID09PSAnb3BhcXVlJykge1xuICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgYSByZXNwb25zZSwgYnV0IGl0XFwncyBvcGFxdWUgc28gY2FuXFwndCBleGFtaW5lIGl0Jyk7XG4gICAgICAgIC8vIERvIHNvbWV0aGluZyB3aXRoIHRoZSByZXNwb25zZSAoaS5lLiBjYWNoZSBpdCBmb3Igb2ZmbGluZSBzdXBwb3J0KVxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdMb29rcyBsaWtlIHRoZXJlIHdhcyBhIHByb2JsZW0uIFN0YXR1cyBDb2RlOiAnLCByZXNwb25zZS5zdGF0dXMpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEV4YW1pbmUgdGhlIHRleHQgaW4gdGhlIHJlc3BvbnNlXG4gICAgICBjb25zb2xlLmxvZyhcIkZpbmFsIFJlc3BvbnNlXCIsIHJlc3BvbnNlKTtcbiAgICAgIHJlc3BvbnNlLmpzb24oKS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlVGV4dCkge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZVRleHQpO1xuICAgICAgICByZXNvbHZlKHJlc3BvbnNlVGV4dCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBwcm9jZXNzRGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIC8vIEZpbHRlciBmb3IgYm9vayByZXZpZXdzIHVzaW5nIGNhdGVnb3JpZXMoIENhdGVnb3J5IFwiMzZcIilcbiAgICBsZXQgZmlsdGVyZWREYXRhID0gZGF0YVswXS5maWx0ZXIoZnVuY3Rpb24ocG9zdCkge1xuICAgICAgcmV0dXJuIHBvc3QuY2F0ZWdvcmllc1swXSA9PT0gMzY7XG4gICAgfSk7XG5cbiAgICBsZXQgdGFnTWFwID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gY3JlYXRlIGEgbWFwIHRoYXQgbWFwcyB0YWcgaWQobnVtYmVyKSB3aXRoIHRhZyBuYW1lXG4gICAgZGF0YVsxXS5mb3JFYWNoKGZ1bmN0aW9uKHRhZykge1xuICAgICAgdGFnTWFwLnNldCh0YWcuaWQsIHRhZy5uYW1lKTtcbiAgICB9KTtcblxuICAgIC8vIE1hcCBvbmx5IHRoZSByZWxldmFudCBwcm9wZXJ0aWVzXG4gICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IGZpbHRlcmVkRGF0YS5tYXAoZnVuY3Rpb24ocG9zdCwgaW5kZXgpIHtcbiAgICAgIC8vIFNpbmNlIHRoZSBjb250ZW50IG9mIHRoZSBwb3N0IGlzIGluIGh0bWwgZm9ybWF0LCB3ZSBzcGxpdCBpdCBieSBuZXdsaW5lIGFuZCBvbmx5IHRha2UgdGhlIGZpcnN0IHNlbnRlbmNlIG9mIHRoZSBwb3N0IGFzIHByZXZpZXcgdGV4dCB0byBzaG93LlxuICAgICAgbGV0IGNvbnRlbnRTcGxpdHRlZCA9IHBvc3QuY29udGVudC5yZW5kZXJlZC5zcGxpdCgnXFxuJyk7XG4gICAgICBsZXQgcHJldmlldyA9IGNvbnRlbnRTcGxpdHRlZFswXTtcblxuICAgICAgbGV0IHRhZ05hbWVMaXN0ID0gW107XG5cbiAgICAgIC8vIEl0ZXJhdGUgb3ZlciB0YWdzLCBnZXR0aW5nIHRhZyBuYW1lIGZyb20gZWFjaCB0YWcgaWQgdXNpbmcgdGFnTWFwLlxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3N0LnRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHRhZ05hbWUgPSB0YWdNYXAuZ2V0KHBvc3QudGFnc1tpXSk7XG4gICAgICAgIGlmIChCb29sZWFuKHRhZ05hbWUpKSB7XG4gICAgICAgICAgdGFnTmFtZUxpc3QucHVzaCh0YWdOYW1lKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBkYXRlOiBwb3N0LmRhdGUsXG4gICAgICAgIHRpdGxlOiBwb3N0LnRpdGxlLnJlbmRlcmVkLFxuICAgICAgICBwcmV2aWV3VGV4dDogcHJldmlldyxcbiAgICAgICAgZnVsbENvbnRlbnQ6IHBvc3QuY29udGVudC5yZW5kZXJlZCxcbiAgICAgICAgaW1hZ2U6IHBvc3QuYmV0dGVyX2ZlYXR1cmVkX2ltYWdlLnNvdXJjZV91cmwsXG4gICAgICAgIHRhZ3M6IHRhZ05hbWVMaXN0LFxuICAgICAgICBpbmRleDogaW5kZXhcbiAgICAgIH07XG4gICAgfSk7XG4gICAgLy8gY29uc29sZS5sb2coJ0NsZWFuIERhdGEgYWZ0ZXIgcmVxdWVzdCBpcyBkb25lISA6JywgcHJvY2Vzc2VkRGF0YSk7XG4gICAgcmV0dXJuIHByb2Nlc3NlZERhdGE7XG4gIH07XG5cbiAgLy8gY29uc29sZS5sb2coZG9jdW1lbnQucmVhZHlTdGF0ZSk7XG4gIGNvbnN0IHJldmlld0RhdGFQcm9taXNlID0gZmV0Y2hEYXRhKCdyZXZpZXdzJykudGhlbihwcm9jZXNzUmVxdWVzdCk7XG4gIGNvbnN0IHRhZ3NEYXRhUHJvbWlzZSA9IGZldGNoRGF0YSgndGFncycpLnRoZW4ocHJvY2Vzc1JlcXVlc3QpO1xuXG4gIFByb21pc2UuYWxsKFtyZXZpZXdEYXRhUHJvbWlzZSwgdGFnc0RhdGFQcm9taXNlXSlcbiAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAudGhlbihyZW5kZXIpXG4gICAgLnRoZW4oY2hhbmdlQm9va0NvdmVyQmFja2dyb3VuZENvbG9yKVxuICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BST01JU0UgQ0hBSU4gQlVTVEVEIEJFQ0FVU0UgT0YgOicsIGVycik7XG4gICAgfSk7XG59KSgpO1xuIl0sImZpbGUiOiJtYWluLmpzIn0=
