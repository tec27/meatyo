var yoplait = require('yoplait')

var udid = '4d45415453504144' // each byte is a letter of MEATSPAC, then +1
  , username = 'MEATSPAC '

yoplait.signUp(username, udid, udid, function(err, yo) {
  if (err) {
    console.log('error: ', err)
  } else {
    console.log('signed up!')
  }
})
