const reviews = localforage.getItem('reviewData').then(function(values) {
  console.log(values);
});