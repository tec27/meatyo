var yoplait = require('yoplait')

var udid = '4d45415453504143' // each byte is a letter of MEATSPAC
  , username = 'MEATSPAC'

yoplait.newUser(username, udid, function(err, yo) {
  if (err) {
    console.log('error: ', err)
  } else {
    console.log('signed up!')
  }
})
