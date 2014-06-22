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
    var match = /^\s*!yo ([^\s]+)\s*/i.exec(msg.message)
    if (!match || match[1] === undefined) {
      return
    }

    var user = match[1].toUpperCase()
      , self = this
    console.log('=> yoing ' + user)
    yoUser.sendYo(user, yoBack)

    function yoBack(err) {
      if (!err) {
        return self.sendMessage(getSuccessPic(), 'YO ' + user + '!', messageCb)
      }

      var errorMessage =
        err.serverCode ? (err.serverCode + ' ' + err.serverError) : JSON.stringify(err)

      self.sendMessage(getErrorPic(), 'Yoing failed yo: ' + errorMessage, messageCb)
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


