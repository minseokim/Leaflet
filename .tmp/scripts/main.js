
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

  const getPostData = function() {
    const requestUrl = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%20%3D%22http%3A%2F%2Fwww.minseoalexkim.com%2Fwp-json%2Fwp%2Fv2%2Fposts%22&format=json&diagnostics=true&callback=';

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
    // var xhttp = new XMLHttpRequest();
    // xhttp.onreadystatechange = function() {
    //   if (this.readyState === 4 && this.status === 200) {
    //     rawPostData = JSON.parse(this.responseText);
    //     let postArray = rawPostData.query.results.json.json;
    //     console.log(postArray);
    //   }
    // };
    // xhttp.open('GET', , true);
    // xhttp.send();
  };
  getPostData().then(function(response) {
    console.log(JSON.parse(response));
  }, function(error) {
    console.error('Failed!', error);
  });
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJtYWluLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuLyogZXNsaW50LWVudiBicm93c2VyICovXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBDaGVjayB0byBtYWtlIHN1cmUgc2VydmljZSB3b3JrZXJzIGFyZSBzdXBwb3J0ZWQgaW4gdGhlIGN1cnJlbnQgYnJvd3NlcixcbiAgLy8gYW5kIHRoYXQgdGhlIGN1cnJlbnQgcGFnZSBpcyBhY2Nlc3NlZCBmcm9tIGEgc2VjdXJlIG9yaWdpbi4gVXNpbmcgYVxuICAvLyBzZXJ2aWNlIHdvcmtlciBmcm9tIGFuIGluc2VjdXJlIG9yaWdpbiB3aWxsIHRyaWdnZXIgSlMgY29uc29sZSBlcnJvcnMuIFNlZVxuICAvLyBodHRwOi8vd3d3LmNocm9taXVtLm9yZy9Ib21lL2Nocm9taXVtLXNlY3VyaXR5L3ByZWZlci1zZWN1cmUtb3JpZ2lucy1mb3ItcG93ZXJmdWwtbmV3LWZlYXR1cmVzXG4gIHZhciBpc0xvY2FsaG9zdCA9IEJvb2xlYW4od2luZG93LmxvY2F0aW9uLmhvc3RuYW1lID09PSAnbG9jYWxob3N0JyB8fFxuICAgICAgLy8gWzo6MV0gaXMgdGhlIElQdjYgbG9jYWxob3N0IGFkZHJlc3MuXG4gICAgICB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT09ICdbOjoxXScgfHxcbiAgICAgIC8vIDEyNy4wLjAuMS84IGlzIGNvbnNpZGVyZWQgbG9jYWxob3N0IGZvciBJUHY0LlxuICAgICAgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lLm1hdGNoKFxuICAgICAgICAvXjEyNyg/OlxcLig/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPykpezN9JC9cbiAgICAgIClcbiAgICApO1xuXG4gIGlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yICYmXG4gICAgICAod2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JyB8fCBpc0xvY2FsaG9zdCkpIHtcbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcignc2VydmljZS13b3JrZXIuanMnKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlZ2lzdHJhdGlvbikge1xuICAgICAgLy8gdXBkYXRlZm91bmQgaXMgZmlyZWQgaWYgc2VydmljZS13b3JrZXIuanMgY2hhbmdlcy5cbiAgICAgIHJlZ2lzdHJhdGlvbi5vbnVwZGF0ZWZvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIHVwZGF0ZWZvdW5kIGlzIGFsc28gZmlyZWQgdGhlIHZlcnkgZmlyc3QgdGltZSB0aGUgU1cgaXMgaW5zdGFsbGVkLFxuICAgICAgICAvLyBhbmQgdGhlcmUncyBubyBuZWVkIHRvIHByb21wdCBmb3IgYSByZWxvYWQgYXQgdGhhdCBwb2ludC5cbiAgICAgICAgLy8gU28gY2hlY2sgaGVyZSB0byBzZWUgaWYgdGhlIHBhZ2UgaXMgYWxyZWFkeSBjb250cm9sbGVkLFxuICAgICAgICAvLyBpLmUuIHdoZXRoZXIgdGhlcmUncyBhbiBleGlzdGluZyBzZXJ2aWNlIHdvcmtlci5cbiAgICAgICAgaWYgKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAvLyBUaGUgdXBkYXRlZm91bmQgZXZlbnQgaW1wbGllcyB0aGF0IHJlZ2lzdHJhdGlvbi5pbnN0YWxsaW5nIGlzIHNldDpcbiAgICAgICAgICAvLyBodHRwczovL3NsaWdodGx5b2ZmLmdpdGh1Yi5pby9TZXJ2aWNlV29ya2VyL3NwZWMvc2VydmljZV93b3JrZXIvaW5kZXguaHRtbCNzZXJ2aWNlLXdvcmtlci1jb250YWluZXItdXBkYXRlZm91bmQtZXZlbnRcbiAgICAgICAgICB2YXIgaW5zdGFsbGluZ1dvcmtlciA9IHJlZ2lzdHJhdGlvbi5pbnN0YWxsaW5nO1xuXG4gICAgICAgICAgaW5zdGFsbGluZ1dvcmtlci5vbnN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKGluc3RhbGxpbmdXb3JrZXIuc3RhdGUpIHtcbiAgICAgICAgICAgICAgY2FzZSAnaW5zdGFsbGVkJzpcbiAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgb2xkIGNvbnRlbnQgd2lsbCBoYXZlIGJlZW4gcHVyZ2VkIGFuZCB0aGVcbiAgICAgICAgICAgICAgICAvLyBmcmVzaCBjb250ZW50IHdpbGwgaGF2ZSBiZWVuIGFkZGVkIHRvIHRoZSBjYWNoZS5cbiAgICAgICAgICAgICAgICAvLyBJdCdzIHRoZSBwZXJmZWN0IHRpbWUgdG8gZGlzcGxheSBhIFwiTmV3IGNvbnRlbnQgaXNcbiAgICAgICAgICAgICAgICAvLyBhdmFpbGFibGU7IHBsZWFzZSByZWZyZXNoLlwiIG1lc3NhZ2UgaW4gdGhlIHBhZ2UncyBpbnRlcmZhY2UuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY2FzZSAncmVkdW5kYW50JzpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBpbnN0YWxsaW5nICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VydmljZSB3b3JrZXIgYmVjYW1lIHJlZHVuZGFudC4nKTtcblxuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIElnbm9yZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZSkge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZHVyaW5nIHNlcnZpY2Ugd29ya2VyIHJlZ2lzdHJhdGlvbjonLCBlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIEN1c3RvbSBKUyBHb2VzIEhlcmVcblxuICBjb25zdCBnZXRQb3N0RGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHJlcXVlc3RVcmwgPSAnaHR0cHM6Ly9xdWVyeS55YWhvb2FwaXMuY29tL3YxL3B1YmxpYy95cWw/cT1zZWxlY3QlMjAqJTIwZnJvbSUyMGpzb24lMjB3aGVyZSUyMHVybCUyMCUzRCUyMmh0dHAlM0ElMkYlMkZ3d3cubWluc2VvYWxleGtpbS5jb20lMkZ3cC1qc29uJTJGd3AlMkZ2MiUyRnBvc3RzJTIyJmZvcm1hdD1qc29uJmRpYWdub3N0aWNzPXRydWUmY2FsbGJhY2s9JztcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgcmVxdWVzdFVybCk7XG5cbiAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGlmIHN0YXR1cyBpcyAyMDBcbiAgICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAyMDApIHtcbiAgICAgICAgICAvLyByZXNvbHZlIHByb21pc2Ugd2l0aCByZXNwb25zZVxuICAgICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXNwb25zZVRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIG90aGVyd2lzZSByZWplY3Qgd2l0aCBzdGF0dXMgdGV4dFxuICAgICAgICAgIHJlamVjdChFcnJvcihyZXF1ZXN0LnN0YXR1c1RleHQpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIC8vIEhhbmRsaW5nIG5ldHdvcmsgZXJyb3JzXG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KEVycm9yKCdOZXR3b3JrIEVycm9yIScpKTtcbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICAgIC8vIHZhciB4aHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIC8vIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gNCAmJiB0aGlzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgLy8gICAgIHJhd1Bvc3REYXRhID0gSlNPTi5wYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgLy8gICAgIGxldCBwb3N0QXJyYXkgPSByYXdQb3N0RGF0YS5xdWVyeS5yZXN1bHRzLmpzb24uanNvbjtcbiAgICAvLyAgICAgY29uc29sZS5sb2cocG9zdEFycmF5KTtcbiAgICAvLyAgIH1cbiAgICAvLyB9O1xuICAgIC8vIHhodHRwLm9wZW4oJ0dFVCcsICwgdHJ1ZSk7XG4gICAgLy8geGh0dHAuc2VuZCgpO1xuICB9O1xuICBnZXRQb3N0RGF0YSgpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICBjb25zb2xlLmxvZyhKU09OLnBhcnNlKHJlc3BvbnNlKSk7XG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIScsIGVycm9yKTtcbiAgfSk7XG59KSgpO1xuIl0sImZpbGUiOiJtYWluLmpzIn0=
