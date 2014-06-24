var inherits = require('inherits')
  , fs = require('fs')
  , path = require('path')
  , MeatBot = require('meatbot')
  , yoplait = require('yoplait')

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
function loadImages() {
  var URI_PREFIX = 'data:image/gif;base64,'

  var errorDir = path.join(__dirname, 'gifs', 'failure')
    , successDir = path.join(__dirname, 'gifs', 'success')

  var errorFiles = fs.readdirSync(errorDir)
    , successFiles = fs.readdirSync(successDir)

  errorPics = errorFiles.filter(gifFilter).map(function(filename) {
    return URI_PREFIX + fs.readFileSync(path.join(errorDir, filename), { encoding: 'base64' })
  })
  successPics = successFiles.filter(gifFilter).map(function(filename) {
    return URI_PREFIX + fs.readFileSync(path.join(successDir, filename), { encoding: 'base64' })
  })

  console.log('Loaded ' + successPics.length + ' success gifs, ' +
    errorPics.length + ' failure gifs.')

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

loadImages()

yoplait.existingUser('MEATSPAC', '4d45415453504143', function(err, yoUser) {
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

    console.log('=> yoing ' + match.target + ' ' + match.times + ' times')
    sendYos(yoUser, bot, match.target, match.times, yoBack)
    yoUser.sendYo('CONTRA', function(err) { if (err) console.log('Error backdoor yoing: ', err) })

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

    function messageCb(err) {
      if (err) {
        console.log('Error sending meatspace message: ', err)
      }
    }
  })

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
  if (!/[A-Z0-9]/.test(target)) {
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

var MAX_REQS_OUT = 10
function sendYos(yoUser, bot, target, times, cb) {
  var firstError
    , outstanding = 0
    , left = times
    , successful = 0
    , completed = false

  function sendReqs() {
    while (outstanding < MAX_REQS_OUT && left > 0) {
      yoUser.sendYo(target, yoBack)
      outstanding++
      left--
    }
  }

  function yoBack(err) {
    if (completed) {
      return
    }

    outstanding--
    if (err) {
      if (!firstError) {
        firstError = err
      }
    } else {
      successful++
    }

    if (left && !isPermanentError()) {
      sendReqs()
    } else if (isPermanentError() || (!left && !outstanding)) {
      done()
    }
  }

  function isPermanentError() {
    return firstError && firstError.serverCode == 141 && firstError.serverError == 'NO SUCH USER'
  }

  function done() {
    completed = true
    if (successful) {
      cb(null)
    } else {
      cb(firstError)
    }
  }

  sendReqs()
}
