var yoplait = require('yoplait')

var udid = '4d45415453504146' // each byte is a letter of MEATSPAC, then +3
  , username = 'MEATSPAC3'

yoplait.signUp(username, udid, udid, function(err, yo) {
  if (err) {
    console.log('error: ', err)
  } else {
    console.log('signed up!')
  }
})
