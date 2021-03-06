var inherits = require('inherits')
  , fs = require('fs')
  , path = require('path')
  , MeatBot = require('meatbot')
  , yoplait = require('yoplait')
  , http = require('http')
  , parseUrl = require('url').parse
  , throttle = require('tokenthrottle')({ rate: 1, burst: 3, window: 60000 })

inherits(MeatYo, MeatBot)
function MeatYo(yoUser) {
  MeatBot.call(this)
  this.yoUser = yoUser
}

MeatYo.prototype.name = ' '
MeatYo.prototype.fingerprint = 'meatyo'

MeatYo.prototype.respond = function(msg, cb) {
  process.nextTick(cb)
}

var errorPics = []
  , successPics = []
  , receivedPics = []
function loadImages() {
  var URI_PREFIX = 'data:image/gif;base64,'

  var errorDir = path.join(__dirname, 'gifs', 'failure')
    , successDir = path.join(__dirname, 'gifs', 'success')
    , receivedDir = path.join(__dirname, 'gifs', 'received')

  var errorFiles = fs.readdirSync(errorDir)
    , successFiles = fs.readdirSync(successDir)
    , receivedFiles = fs.readdirSync(receivedDir)

  errorPics = errorFiles.filter(gifFilter).map(function(filename) {
    return URI_PREFIX + fs.readFileSync(path.join(errorDir, filename), { encoding: 'base64' })
  })
  successPics = successFiles.filter(gifFilter).map(function(filename) {
    return URI_PREFIX + fs.readFileSync(path.join(successDir, filename), { encoding: 'base64' })
  })
  receivedPics = receivedFiles.filter(gifFilter).map(function(filename) {
    return URI_PREFIX + fs.readFileSync(path.join(receivedDir, filename), { encoding: 'base64' })
  })

  console.log('Loaded ' + successPics.length + ' success gifs, ' +
    errorPics.length + ' failure gifs, ' +
    receivedPics.length + ' receive gifs.')

  function gifFilter(elem) {
    return /\.gif$/i.test(elem)
  }
}

function getErrorPic() {
  return errorPics[(Math.random() * errorPics.length) | 0]
}

function getSuccessPic() {
  return successPics[(Math.random() * successPics.length) | 0]
}

function getReceivedPic() {
  return receivedPics[(Math.random() * receivedPics.length) | 0]
}

loadImages()

var udid = '4d45415453504146'
yoplait.logIn('MEATSPAC3', udid, udid, function(err, yoUser) {
  if (err) {
    return console.log('error registering yo install: ', err)
  }

  console.log('Yo install registered.')

  var bot = new MeatYo(yoUser)

  bot.on('message', function(msg) {
    var match = matchMessage(msg.message)
    if (!match) {
      return
    }
    if (match.target == 'MEATSPAC3') {
      return
    }

    console.log('=> yoing ' + match.target + ' ' + match.times + ' times')
    sendYos(yoUser, bot, match.target, match.times, yoBack)

    function yoBack(err) {
      if (!err) {
        var message = 'YO' + (match.times > 1 ? ('x' + match.times + ' ') : ' ') +
          match.target + '!'
        return bot.sendMessage(getSuccessPic(), message, messageCb)
      }

      var errorMessage =
        err.serverCode ? (err.serverCode + ' ' + err.serverError) : JSON.stringify(err)

      bot.sendMessage(getErrorPic(), 'Yoing failed yo: ' + errorMessage, messageCb)
      console.log('yoing failed: ',  err)
    }
  })

  http.createServer(function(req, res) {
    res.writeHead(200)
    res.end()
    var parsed = parseUrl(req.url, true)
    if (!parsed.query || !parsed.query.username) {
      return
    }

    var yoer = parsed.query.username
    if (!/^[A-Z][A-Z0-9]*$/.test(yoer)) {
      return // only real way we can "validate" these Yo's, cause the webhook guarantees are shit
    }
    console.log('Received a yo from ' + yoer)

    throttle.rateLimit('yo', function (err, limited) {
      if (err || limited) {
        return
      }

      bot.sendMessage(getReceivedPic(), yoer + ' says \'Yo!\'', messageCb)
    })

  }).listen(process.env.PORT || 1337).on('listening', function() {
      console.log('Yo server listening on ' + (process.env.PORT || 1337))
  })

  function messageCb(err) {
    if (err) {
      console.log('Error sending meatspace message: ', err)
    }
  }

  bot.on('connect', function() {
    console.log('Connected.')
  }).on('disconnect', function() {
    console.log('Disconnected.')
  })
  bot.connect()
})

function matchMessage(msg) {
  var msgParts = msg.toUpperCase().split(/\s+/)
    , isYo = false
    , i
  for (i = 0; i < msgParts.length; i++) {
    if (msgParts[i] == '!YO') {
      isYo = true
      break
    }
  }

  i++
  if (!isYo || i >= msgParts.length) {
    return null
  }

  var target = msgParts[i]
  if (!/^[A-Z0-9]+$/.test(target)) {
    return null
  }

  i++
  if (i >= msgParts.length) {
    return { target: target, times: 1 }
  }

  var times = +msgParts[i]
  if (isNaN(times)) {
    times = 1
  }
  times = Math.max(Math.min(times, 20), 1)

  return { target: target, times: times }
}

// It feels like they are holding Yo's back to try and coalesce rapid ones into a single one now, so
// these delays are pretty long (and still might not result in them all going through, the API
// returns success even when it fails to deliver :( ). In the future we should check again to see
// if the app allows faster sending.
var REQ_DELAY = 1000
  , RETRY_DELAY = 2000
function sendYos(yoUser, bot, target, times, cb) {
  var firstError
    , left = times
    , successful = 0
    , fails = 0
    , completed = false
    , calledBack = false
    , isRetrying = false

  function sendReq() {
    yoUser.sendYo(target, yoBack)
    left--
  }

  function yoBack(err) {
    if (completed) {
      return
    }

    if (err) {
      console.log('error!', err)
      if (!isRetrying && isRetryableError(err)) {
        left++
        isRetrying = true
        console.log('retrying a failed send...')
      } else {
        isRetrying = false
        fails++
        if (!firstError) {
          firstError = err
        }
      }
    } else {
      isRetrying = false
      successful++
    }

    if (left && !isPermanentError()) {
      setTimeout(sendReq, isRetrying ? RETRY_DELAY : REQ_DELAY)
    } else if (isPermanentError() || !left) {
      done()
    }

    // Call back after the first fail/success so we don't make users wait, since Yo's are slow now
    if (!calledBack) {
      calledBack = true
      cb(successful ? null : firstError)
    }
  }

  function isRetryableError(err) {
    return err.serverCode == 141 && err.serverError == 'NO'
  }

  function isPermanentError() {
    return firstError && firstError.serverCode == 141 && firstError.serverError == 'NO SUCH USER'
  }

  function done() {
    completed = true
    if (successful) {
      if (fails) {
        console.log('<= succeeded ' + successful + ', but failed ' + fails + ' times')
      } else {
        console.log('<= succeeded ' + successful + ' times')
      }
    } else {
      console.log('<= yoing failed (' + fails + ') ', firstError)
    }
  }

  sendReq()
}
