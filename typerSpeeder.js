//@FLOW

const co = require('co');
var Nightmare = require('nightmare');
var nightmare = Nightmare({ show: true });

const wpm = Number(process.argv[2]);
const url = process.argv[3];
const username = process.argv[4] || undefined;
const password = process.argv[5] || undefined;

if (wpm > 0 && url) {
  try {
    speedRace(wpm, url, username, password);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
} else {
  console.log('Please enter a numerical wpm and a valid typeracer url');
  process.exit(1);
}

function speedRace(wpm, url, username, password) {
  co(function* () {

    var i = 0;

    if (!url.match(/http:\/\/play.typeracer.com\/\?rt=/)) {
      throw Error('URL Does not match the format http://play.typeracer.com/?rt=CODE');
    }

    console.log('Waiting for page to finish loading...');

    yield nightmare.goto(url);

    console.log('Attempting to sign in...');

    if (Boolean(username) ^ Boolean(password)) {
      throw Error('Please include both a password and username, or neither'); //throw error if username XOR password is provided
    }
    if (Boolean(username) && Boolean(password)) {
      if (yield nightmare.exists('a[title^="Sign in"]')) {
        console.log('Signing in...');
        yield nightmare
          .click('a[title^="Sign in"]')
          .wait('.editUserPopup')
          .insert('input[name="username"]', username)
          .insert('input[name="password"]', password)
          .click('.editUserPopup .gwt-Button');
      } else {
        console.log('Already signed in.');
      }
    }

    console.log('Joining race...');

    yield nightmare.click('.raceAgainLink'); //start race

    console.log('Extracting text...')

    var textToType = yield nightmare.evaluate(function() {
      return document.querySelector('.nonHideableWords').innerText;
    }) || 'Error';

    var words = textToType.split(' ');

    if (!textToType) {
      throw Error('Cannot extract text to type');
    }

    console.log('Waiting for race to start...');

    yield nightmare.wait('.txtInput:not(.txtInput-unfocused)')

    for (var word in words) {
      process.stdout.write(`Writing word ${word} of ${words.length}...\r`);
      yield nightmare.insert('.txtInput:not(.txtInput-unfocused)', words[word]);
      yield nightmare.type('.txtInput:not(.txtInput-unfocused)', ' ');
      var delayTime = 60/wpm * 1000 - 100; //-100 because of https://github.com/segmentio/nightmare/blob/master/lib/runner.js#L226, so sadly this means that max WPM is less than 600 (due to delay from js execution and DOM manipulation)
      if (delayTime > 0) {
        yield delay(delayTime);
      }
    }
    console.log('Finished racing...');

    nightmare.end();
  });
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
