/*
Copyright (c) 2011 Rdio Inc
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

var lyrics;
// a global variable that will hold a reference to the api swf once it has loaded
var apiswf = null;

$(document).ready(function() {
  // on page load use SWFObject to load the API swf into div#apiswf
  var flashvars = {
    'playbackToken': playback_token, // from token.js
    'domain': domain,                // from token.js
    'listener': 'callback_object'    // the global name of the object that will receive callbacks from the SWF
    };
  var params = {
    'allowScriptAccess': 'always'
  };
  var attributes = {};
  swfobject.embedSWF('http://www.rdio.com/api/swf/', // the location of the Rdio Playback API SWF
      'apiswf', // the ID of the element that will be replaced with the SWF
      1, 1, '9.0.0', 'expressInstall.swf', flashvars, params, attributes);

  // set up the controls
  $('#play').click(function() {
    apiswf.rdio_play($('#play_key').val());
  });
  $('#stop').click(function() { apiswf.rdio_stop(); });
  $('#pause').click(function() { apiswf.rdio_pause(); });
  $('#previous').click(function() { apiswf.rdio_previous(); });
  $('#next').click(function() { lyrics = " "; apiswf.rdio_next(); });

});


// the global callback object
var callback_object = {};

callback_object.ready = function ready(user) {
  // Called once the API SWF has loaded and is ready to accept method calls.

  // find the embed/object element
  apiswf = $('#apiswf').get(0);

  apiswf.rdio_startFrequencyAnalyzer({
    frequencies: '10-band',
    period: 100
  });

  if (user == null) {
    $('#nobody').show();
  } else if (user.isSubscriber) {
    $('#subscriber').show();
  } else if (user.isTrial) {
    $('#trial').show();
  } else if (user.isFree) {
    $('#remaining').text(user.freeRemaining);
    $('#free').show();
  } else {
    $('#nobody').show();
  }

  console.log(user);
};

callback_object.freeRemainingChanged = function freeRemainingChanged(remaining) {
  $('#remaining').text(remaining);
};

callback_object.playStateChanged = function playStateChanged(playState) {
  // The playback state has changed.
  // The state can be: 0 - paused, 1 - playing, 2 - stopped, 3 - buffering or 4 - paused.
  $('#playState').text(playState);

};

callback_object.playingTrackChanged = function playingTrackChanged(playingTrack, sourcePosition) {
  // The currently playing track has changed.
  // Track metadata is provided as playingTrack and the position within the playing source as sourcePosition.
  if (playingTrack != null) {
    $('#track').text(playingTrack['name']);
    $('#album').text(playingTrack['album']);
    $('#artist').text(playingTrack['artist']);
    $('#art').attr('src', playingTrack['icon']);

// Set lyrics to blank in between songs.
    lyrics = " ";
    $("#lyrics").html(" ");

// When track changes:
// (1) Search Rdio for album, and return album information including dominantColor (in home controller and rdio.rb),
// (2) Parse rgba color information into appropriate format,
// (3) Make that color the background color, and
// (4) Make the text white.
    artBackground = function() {
      var trackAlbum = $('#album').html();
      $.ajax("/album", {
        type: "POST",
        data: {
          'album': trackAlbum
        },
        dataType: "json",
        success: function(data) {
          album = data;

          var result = "rgba(";
          r = album.r;
          g = album.g;
          b = album.b;
          a = album.a;
          var color = result + r + ", " + g + ", " + b + ", " + a + ")";
          $("body").css("backgroundColor", color);
          $("body").css("color", "white");
        },
        error: function() {
          console.log("ALBUM ERROR");
        }
      });
    };
    artBackground();

// When track changes:
// (1) Update url used to make Musixmatch API call with appropriate artist and track information.
// (2) Data is parsed in lyrics controller and is returned as an array with seconds and lyrics.
// This is stored as a global variable 'lyrics' on the top of the file.
    updateUrl = function() {
      var trackArtist = $('#artist').html();
      var trackName = $('#track').html();
      var method = "track.search";
      console.log("working?");
      $.ajax("/lyrics", {
        type: "POST",
        data: {
          'artist': trackArtist,
          'track': trackName,
          'method': method,
        },
        dataType: "json",
        success: function(data) {
          lyrics = data;
          console.log("working!");
        },
        error: function() {
          console.log("ERROR");
        }
      });
    };
    updateUrl();

  }
};

callback_object.playingSourceChanged = function playingSourceChanged(playingSource) {
  // The currently playing source changed.
  // The source metadata, including a track listing is inside playingSource.
};

callback_object.volumeChanged = function volumeChanged(volume) {
  // The volume changed to volume, a number between 0 and 1.
};

callback_object.muteChanged = function muteChanged(mute) {
  // Mute was changed. mute will either be true (for muting enabled) or false (for muting disabled).
};

callback_object.positionChanged = function positionChanged(position) {
  // The position within the track changed to position seconds.
  // This happens both in response to a seek and during playback.
  // ////////////////////////////////////////////////////////////
  // When track positing changes, the lyrics stored in the global variable are grabbed, iterated through,
  // and if the seconds are less than the current position (in seconds), add them to the screen via html.
  $('#position').text(position);
    lyrics.forEach(function(lyric) {
      for (var i = 0; lyrics[i].time < position + 1; i++) {
        $('#lyrics').html(lyrics[i].lyrics);
      }
    });
};

callback_object.queueChanged = function queueChanged(newQueue) {
  // The queue has changed to newQueue.
};

callback_object.shuffleChanged = function shuffleChanged(shuffle) {
  // The shuffle mode has changed.
  // shuffle is a boolean, true for shuffle, false for normal playback order.
};

callback_object.repeatChanged = function repeatChanged(repeatMode) {
  // The repeat mode change.
  // repeatMode will be one of: 0: no-repeat, 1: track-repeat or 2: whole-source-repeat.
};

callback_object.playingSomewhereElse = function playingSomewhereElse() {
  // An Rdio user can only play from one location at a time.
  // If playback begins somewhere else then playback will stop and this callback will be called.
};

callback_object.updateFrequencyData = function updateFrequencyData(arrayAsString) {
  // Called with frequency information after apiswf.rdio_startFrequencyAnalyzer(options) is called.
  // arrayAsString is a list of comma separated floats.

  var arr = arrayAsString.split(',');

  $('#freq div').each(function(i) {
    $(this).width(parseInt(parseFloat(arr[i])*500));
  });

};
