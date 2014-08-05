var yoplait = require('yoplait')

var udid = '4d45415453504146'
yoplait.logIn('MEATSPAC3', udid, udid, function(err, yoUser) {
  if (err) {
    return console.log('error registering yo install: ', err)
  }

  console.log('Yo install registered.')

  yoUser.updateCallbackUrl('http://' + process.env.HTTP_HOST + ':' + process.env.PORT,
      function (err) {
    if (err) {
      console.log('updating callback URL failed', err)
    } else {
      console.log('callback URL updated!')
    }
  })
})
